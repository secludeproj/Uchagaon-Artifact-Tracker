// ============================================================
// db.ts — All database operations centralised here
// Clean separation: components never call supabase directly
// ============================================================

import { supabase, DbArtifact, DbMovementLog, DbInspectionLog } from './supabase';
import { Artifact, MovementLog, Staff, TeamActivity, Duty } from '../types';

// ── Converters ────────────────────────────────────────────────────────────────

export function dbToArtifact(
  row: DbArtifact,
  movements: DbMovementLog[] = [],
  inspections: DbInspectionLog[] = []
): Artifact {
  return {
    id: row.id,
    qrCode: row.qr_code,
    name: row.name,
    category: row.category as Artifact['category'],
    description: row.description,
    estimatedAge: row.estimated_age,
    material: row.material,
    dimensions: row.dimensions,
    condition: row.condition as Artifact['condition'],
    estimatedValue: row.estimated_value,
    originalLocation: row.original_location,
    currentLocation: row.current_location,
    status: row.status as Artifact['status'],
    photos: row.photos || [],
    handlingNotes: row.handling_notes,
    conservationNotes: row.conservation_notes,
    lastInspectedDate: row.last_inspected_date || '',
    story: row.story,
    addedBy: row.added_by,
    lastUpdatedBy: row.last_updated_by,
    addedDate: row.added_date,
    lastUpdatedDate: row.last_updated_date,
    pendingSync: row.pending_sync,
    movementHistory: movements.map(m => ({
      id: m.id,
      date: m.date,
      oldLocation: m.old_location,
      newLocation: m.new_location,
      oldStatus: m.old_status || undefined,
      newStatus: m.new_status || undefined,
      note: m.note,
      staffMember: m.staff_member,
    })),
    inspectionHistory: inspections.map(i => ({
      id: i.id,
      date: i.date,
      inspector: i.inspector,
      notes: i.notes,
      photoUrl: i.photo_url,
      condition: i.condition,
    })),
  };
}

export function artifactToDb(artifact: Partial<Artifact>): Partial<DbArtifact> {
  const db: Partial<DbArtifact> = {};
  if (artifact.name !== undefined) db.name = artifact.name;
  if (artifact.qrCode !== undefined) db.qr_code = artifact.qrCode;
  if (artifact.category !== undefined) db.category = artifact.category;
  if (artifact.description !== undefined) db.description = artifact.description;
  if (artifact.estimatedAge !== undefined) db.estimated_age = artifact.estimatedAge;
  if (artifact.material !== undefined) db.material = artifact.material;
  if (artifact.dimensions !== undefined) db.dimensions = artifact.dimensions;
  if (artifact.condition !== undefined) db.condition = artifact.condition;
  if (artifact.estimatedValue !== undefined) db.estimated_value = artifact.estimatedValue;
  if (artifact.originalLocation !== undefined) db.original_location = artifact.originalLocation;
  if (artifact.currentLocation !== undefined) db.current_location = artifact.currentLocation;
  if (artifact.status !== undefined) db.status = artifact.status;
  if (artifact.photos !== undefined) db.photos = artifact.photos;
  if (artifact.handlingNotes !== undefined) db.handling_notes = artifact.handlingNotes;
  if (artifact.conservationNotes !== undefined) db.conservation_notes = artifact.conservationNotes;
  if (artifact.lastInspectedDate !== undefined) db.last_inspected_date = artifact.lastInspectedDate || null;
  if (artifact.story !== undefined) db.story = artifact.story;
  if (artifact.addedBy !== undefined) db.added_by = artifact.addedBy;
  if (artifact.lastUpdatedBy !== undefined) db.last_updated_by = artifact.lastUpdatedBy;
  return db;
}

// ── Artifact Queries ──────────────────────────────────────────────────────────

export async function fetchAllArtifacts(): Promise<Artifact[]> {
  const [artifactsRes, movementsRes, inspectionsRes] = await Promise.all([
    supabase.from('artifacts').select('*').order('added_date', { ascending: false }),
    supabase.from('movement_logs').select('*').order('date', { ascending: false }),
    supabase.from('inspection_logs').select('*').order('date', { ascending: false }),
  ]);

  if (artifactsRes.error) throw artifactsRes.error;
  const artifacts = artifactsRes.data;
  if (!artifacts) return [];

  const movements = movementsRes.data;
  const inspections = inspectionsRes.data;

  return artifacts.map(a =>
    dbToArtifact(
      a,
      (movements || []).filter(m => m.artifact_id === a.id),
      (inspections || []).filter(i => i.artifact_id === a.id)
    )
  );
}

export async function insertArtifact(
  payload: Partial<Artifact>,
  user: { name: string; email: string }
): Promise<Artifact> {
  const now = new Date().toISOString();
  const dbPayload = {
    ...artifactToDb(payload),
    added_by: user.name,
    added_by_email: user.email,
    last_updated_by: user.name,
    last_updated_by_email: user.email,
    added_date: now,
    last_updated_date: now,
  };

  const { data, error } = await supabase
    .from('artifacts')
    .insert(dbPayload)
    .select()
    .single();

  if (error) throw error;
  return dbToArtifact(data);
}

export async function updateArtifact(
  id: string,
  payload: Partial<Artifact>,
  user: { name: string; email: string }
): Promise<void> {
  const dbPayload = {
    ...artifactToDb(payload),
    last_updated_by: user.name,
    last_updated_by_email: user.email,
    last_updated_date: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('artifacts')
    .update(dbPayload)
    .eq('id', id);

  if (error) throw error;
}

export async function deleteArtifact(id: string): Promise<void> {
  const { error } = await supabase
    .from('artifacts')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ── Movement / Custody Transfer ───────────────────────────────────────────────

export async function logMovement(
  artifactId: string,
  data: { newLocation: string; newStatus: string; note: string },
  artifact: Artifact,
  user: { name: string; email: string }
): Promise<void> {
  // Insert movement log
  const { error: movErr } = await supabase
    .from('movement_logs')
    .insert({
      artifact_id: artifactId,
      date: new Date().toISOString(),
      old_location: artifact.currentLocation,
      new_location: data.newLocation,
      old_status: artifact.status,
      new_status: data.newStatus,
      note: data.note,
      staff_member: user.name,
      staff_email: user.email,
    });

  if (movErr) throw movErr;

  // Update artifact location + status
  const { error: artErr } = await supabase
    .from('artifacts')
    .update({
      current_location: data.newLocation,
      status: data.newStatus,
      last_updated_by: user.name,
      last_updated_by_email: user.email,
      last_updated_date: new Date().toISOString(),
    })
    .eq('id', artifactId);

  if (artErr) throw artErr;
}

// ── Inspection Logs ───────────────────────────────────────────────────────────

export async function logInspection(
  artifactId: string,
  data: { notes: string; condition: string; photoUrl?: string },
  user: { name: string; email: string }
): Promise<void> {
  const now = new Date().toISOString();

  const { error: insErr } = await supabase
    .from('inspection_logs')
    .insert({
      artifact_id: artifactId,
      date: now,
      inspector: user.name,
      inspector_email: user.email,
      notes: data.notes,
      condition: data.condition,
      photo_url: data.photoUrl || '',
    });

  if (insErr) throw insErr;

  // Update artifact condition + last inspected date
  const { error: artErr } = await supabase
    .from('artifacts')
    .update({
      condition: data.condition,
      last_inspected_date: now,
      last_updated_by: user.name,
      last_updated_date: now,
    })
    .eq('id', artifactId);

  if (artErr) throw artErr;
}

// ── Team Activity ─────────────────────────────────────────────────────────────

export async function logActivity(
  action: TeamActivity['action'],
  artifactName: string,
  artifactId: string,
  details: string,
  user: { id?: string; name: string; email: string }
): Promise<void> {
  await supabase.from('team_activity').insert({
    user_id: user.id || null,
    user_name: user.name,
    user_email: user.email,
    action,
    artifact_name: artifactName,
    artifact_id: artifactId,
    details,
    timestamp: new Date().toISOString(),
  });
}

export async function fetchTeamActivity(): Promise<TeamActivity[]> {
  const { data, error } = await supabase
    .from('team_activity')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(100);

  if (error) throw error;
  return (data || []).map(r => ({
    id: r.id,
    userId: r.user_id || '',
    userName: r.user_name,
    userEmail: r.user_email,
    action: r.action as TeamActivity['action'],
    artifactName: r.artifact_name,
    artifactId: r.artifact_id,
    timestamp: r.timestamp,
    details: r.details,
  }));
}

// ── Staff Duty Log ─────────────────────────────────────────────────────────────

export async function fetchDuties(): Promise<Duty[]> {
  const { data, error } = await supabase
    .from('duties')
    .select('*')
    .order('assigned_date', { ascending: false });

  if (error) throw error;
  return (data || []).map((d: any) => ({
    id: d.id,
    assignedToName: d.assigned_to_name,
    task: d.task,
    relatedItemId: d.related_item_id || undefined,
    relatedItemName: d.related_item_name || undefined,
    status: d.status,
    assignedDate: d.assigned_date,
    assignedBy: d.assigned_by,
    dueDate: d.due_date || undefined,
    completedDate: d.completed_date || undefined,
    notes: d.notes || undefined,
  }));
}

export async function addDuty(duty: {
  assignedToName: string;
  task: string;
  relatedItemId?: string;
  relatedItemName?: string;
  assignedBy: string;
  dueDate?: string;
}): Promise<Duty> {
  const { data, error } = await supabase
    .from('duties')
    .insert({
      assigned_to_name: duty.assignedToName,
      task: duty.task,
      related_item_id: duty.relatedItemId || null,
      related_item_name: duty.relatedItemName || null,
      assigned_by: duty.assignedBy,
      due_date: duty.dueDate || null,
      status: 'Pending',
    })
    .select()
    .single();

  if (error) throw error;
  return {
    id: data.id,
    assignedToName: data.assigned_to_name,
    task: data.task,
    relatedItemId: data.related_item_id || undefined,
    relatedItemName: data.related_item_name || undefined,
    status: data.status,
    assignedDate: data.assigned_date,
    assignedBy: data.assigned_by,
    dueDate: data.due_date || undefined,
    completedDate: data.completed_date || undefined,
    notes: data.notes || undefined,
  };
}

export async function updateDutyStatus(id: string, status: 'Pending' | 'Completed'): Promise<void> {
  const { error } = await supabase
    .from('duties')
    .update({
      status,
      completed_date: status === 'Completed' ? new Date().toISOString() : null,
    })
    .eq('id', id);

  if (error) throw error;
}

export async function deleteDuty(id: string): Promise<void> {
  const { error } = await supabase.from('duties').delete().eq('id', id);
  if (error) throw error;
}

// ── Staff / Profiles ──────────────────────────────────────────────────────────

export async function fetchAllStaff(): Promise<Staff[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('joined_date', { ascending: false });

  if (error) throw error;
  return (data || []).map(p => ({
    id: p.id,
    email: p.email,
    name: p.name,
    role: p.role,
    avatarUrl: p.avatar_url || undefined,
    joinedDate: p.joined_date,
    lastActive: p.last_active,
  }));
}

export async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) return null;
  return data;
}

export async function upsertProfile(
  userId: string,
  profile: { name: string; email: string; role?: string; avatar_url?: string }
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      ...profile,
      last_active: new Date().toISOString(),
    });

  if (error) throw error;
}

// ── Bulk Import ───────────────────────────────────────────────────────────────

export async function bulkInsertArtifacts(
  rows: Partial<Artifact>[],
  user: { name: string; email: string }
): Promise<number> {
  const now = new Date().toISOString();
  const dbRows = rows.map(r => ({
    ...artifactToDb(r),
    added_by: user.name,
    added_by_email: user.email,
    last_updated_by: user.name,
    last_updated_by_email: user.email,
    added_date: now,
    last_updated_date: now,
  }));

  const { data, error } = await supabase
    .from('artifacts')
    .insert(dbRows)
    .select();

  if (error) throw error;
  return data?.length || 0;
}

// ── Conservation Schedule ──────────────────────────────────────────────────────

export interface ScheduleNote {
  id?: string;
  artifactId: string;
  plannedDate: string;
  assignedTo: string;
  notes: string;
  priority: "High" | "Medium" | "Low";
  createdBy: string;
  createdByEmail?: string;
  createdAt: string;
}

export async function fetchConservationSchedule(): Promise<Record<string, ScheduleNote>> {
  const { data, error } = await supabase
    .from("conservation_schedule")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("Could not fetch conservation schedule:", error);
    return {};
  }

  const result: Record<string, ScheduleNote> = {};
  (data || []).forEach((row: any) => {
    // Keep only the most recent note per artifact
    if (!result[row.artifact_id]) {
      result[row.artifact_id] = {
        id: row.id,
        artifactId: row.artifact_id,
        plannedDate: row.planned_date || "",
        assignedTo: row.assigned_to || "",
        notes: row.notes || "",
        priority: row.priority || "Medium",
        createdBy: row.created_by || "",
        createdByEmail: row.created_by_email || "",
        createdAt: row.created_at,
      };
    }
  });
  return result;
}

export async function saveConservationSchedule(
  note: ScheduleNote,
  user: { name: string; email: string }
): Promise<void> {
  // Delete any existing note for this artifact first (keep only one active plan per artifact)
  await supabase.from("conservation_schedule").delete().eq("artifact_id", note.artifactId);

  const { error } = await supabase.from("conservation_schedule").insert({
    artifact_id: note.artifactId,
    planned_date: note.plannedDate || null,
    assigned_to: note.assignedTo,
    priority: note.priority,
    notes: note.notes,
    created_by: user.name,
    created_by_email: user.email,
  });

  if (error) throw error;
}

export async function deleteConservationSchedule(artifactId: string): Promise<void> {
  const { error } = await supabase
    .from("conservation_schedule")
    .delete()
    .eq("artifact_id", artifactId);

  if (error) throw error;
}
