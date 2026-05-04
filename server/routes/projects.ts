import { Router, Request as ExpressRequest, Response as ExpressResponse } from "express";
import { supabase, s3Client, R2_BUCKET_NAME } from "../lib/config.js";
import { authenticate } from "../lib/middleware.js";
import { handleError, getSafeUpdate } from "../lib/utils.js";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

const router = Router();

router.get("/", authenticate, async (req: ExpressRequest, res: ExpressResponse) => {
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = parseInt(req.query.offset as string) || 0;
  const q = req.query.q as string;

  let query = supabase
    .from("projects")
    .select(`
      *,
      diagrams(id, name, updated_at, is_deleted, project_id),
      notes(id, title, updated_at, is_deleted, project_id),
      drawings(id, title, updated_at, is_deleted, project_id),
      flowcharts(id, title, updated_at, is_deleted, project_id)
    `, { count: 'exact' })
    .eq("is_deleted", false)
    .eq("user_id", (req as any).user.id);

  if (q && q.trim()) {
    query = query.ilike("name", `%${q.trim()}%`);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return handleError(res, error, "Supabase error fetching projects");
  
  // Filter out deleted items from the nested arrays (Supabase filter on joins can be tricky, so we do it here)
  const projectsWithFiles = (data || []).map((project: any) => {
    const diagrams = (project.diagrams || []).filter((f: any) => !f.is_deleted);
    const notes = (project.notes || []).filter((f: any) => !f.is_deleted);
    const drawings = (project.drawings || []).filter((f: any) => !f.is_deleted);
    const flowcharts = (project.flowcharts || []).filter((f: any) => !f.is_deleted);
    
    return {
      ...project,
      diagrams,
      notes,
      drawings,
      flowcharts,
      files_count: diagrams.length + notes.length + drawings.length + flowcharts.length
    };
  });
  
  // Also fetch Uncategorized files (project_id is null)
  const userId = (req as any).user.id;
  const [uDiagrams, uNotes, uDrawings, uFlowcharts] = await Promise.all([
    supabase.from("diagrams").select("id, name, updated_at, is_deleted, project_id").is("project_id", null).eq("is_deleted", false).eq("user_id", userId),
    supabase.from("notes").select("id, title, updated_at, is_deleted, project_id").is("project_id", null).eq("is_deleted", false).eq("user_id", userId),
    supabase.from("drawings").select("id, title, updated_at, is_deleted, project_id").is("project_id", null).eq("is_deleted", false).eq("user_id", userId),
    supabase.from("flowcharts").select("id, title, updated_at, is_deleted, project_id").is("project_id", null).eq("is_deleted", false).eq("user_id", userId),
  ]);
  
  res.json({ 
    data: projectsWithFiles, 
    uncategorized: {
      diagrams: uDiagrams.data || [],
      notes: uNotes.data || [],
      drawings: uDrawings.data || [],
      flowcharts: uFlowcharts.data || []
    },
    total: count
  });
});

router.post("/", authenticate, async (req: ExpressRequest, res: ExpressResponse) => {
  const { name } = req.body;
  const { data, error } = await supabase
    .from("projects")
    .insert([{ name, user_id: (req as any).user.id }])
    .select()
    .single();

  if (error) return handleError(res, error, "Failed to create project");
  res.json(data);
});

router.put("/:id", authenticate, async (req: ExpressRequest, res: ExpressResponse) => {
  const { name } = req.body;
  const { error } = await supabase
    .from("projects")
    .update({ name })
    .eq("id", req.params.id)
    .eq("user_id", (req as any).user.id);

  if (error) return handleError(res, error, "Failed to update project");
  res.json({ success: true });
});

router.delete("/:id", authenticate, async (req: ExpressRequest, res: ExpressResponse) => {
  const projectId = req.params.id;
  const update = getSafeUpdate(true);
  
  const { error } = await supabase
    .from("projects")
    .update(update)
    .eq("id", projectId)
    .eq("user_id", (req as any).user.id);

  if (error) return handleError(res, error, "Failed to delete project");

  // Cascading soft delete
  try {
    await Promise.all([
      supabase.from("diagrams").update(update).eq("project_id", projectId),
      supabase.from("notes").update(update).eq("project_id", projectId),
      supabase.from("drawings").update(update).eq("project_id", projectId),
      supabase.from("flowcharts").update(update).eq("project_id", projectId),
    ]);
  } catch (err) {
    console.error("Cascading soft delete failed:", err);
  }

  res.json({ success: true });
});

router.post("/:id/restore", authenticate, async (req: ExpressRequest, res: ExpressResponse) => {
  const projectId = req.params.id;
  const update = getSafeUpdate(false);

  const { error } = await supabase
    .from("projects")
    .update(update)
    .eq("id", projectId)
    .eq("user_id", (req as any).user.id);

  if (error) return handleError(res, error, "Failed to restore project");

  // Cascading restore
  try {
    await Promise.all([
      supabase.from("diagrams").update(update).eq("project_id", projectId),
      supabase.from("notes").update(update).eq("project_id", projectId),
      supabase.from("drawings").update(update).eq("project_id", projectId),
      supabase.from("flowcharts").update(update).eq("project_id", projectId),
    ]);
  } catch (err) {
    console.error("Cascading restore failed:", err);
  }

  res.json({ success: true });
});

router.delete("/:id/permanent", authenticate, async (req: ExpressRequest, res: ExpressResponse) => {
  const projectId = req.params.id;
  
  try {
    const { data: diagrams } = await supabase.from("diagrams").select("id").eq("project_id", projectId);
    const diagramIds = diagrams?.map(f => f.id) || [];

    if (diagramIds.length > 0) {
      await supabase.from("relationships").delete().in("file_id", diagramIds);
      const { data: entities } = await supabase.from("entities").select("id").in("file_id", diagramIds);
      const entityIds = entities?.map(e => e.id) || [];
      if (entityIds.length > 0) {
        await supabase.from("columns").delete().in("entity_id", entityIds);
      }
      await supabase.from("entities").delete().in("file_id", diagramIds);
      await supabase.from("diagrams").delete().in("id", diagramIds);
    }
    
    // Delete images from notes before deleting notes
    const { data: notes } = await supabase.from("notes").select("content").eq("project_id", projectId);
    if (notes && notes.length > 0 && s3Client && R2_BUCKET_NAME) {
      for (const note of notes) {
        if (note.content) {
          const regex = /<img[^>]+src="([^">]+)"/g;
          let match;
          while ((match = regex.exec(note.content)) !== null) {
            const url = match[1];
            if (url.includes('erd-builder-pro/')) {
              const key = url.substring(url.indexOf('erd-builder-pro/'));
              try {
                await s3Client.send(new DeleteObjectCommand({
                  Bucket: R2_BUCKET_NAME,
                  Key: key,
                }));
              } catch (err) {
                console.error("Failed to delete image from R2 during project deletion:", err);
              }
            }
          }
        }
      }
    }

    await supabase.from("notes").delete().eq("project_id", projectId);
    await supabase.from("drawings").delete().eq("project_id", projectId);
    await supabase.from("projects").delete().eq("id", projectId).eq("user_id", (req as any).user.id);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
