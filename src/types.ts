export interface MovementLog {
  id: string;
  date: string;
  oldLocation: string;
  newLocation: string;
  oldStatus?: string;
  newStatus?: string;
  note: string;
  staffMember: string;
}

export interface Artifact {
  id: string;
  qrCode: string; // Auto-generated string representing the QR / barcode
  name: string;
  category: string; // one of the base heritage categories, or a custom category added by a user
  subCategory?: string; // optional finer-grained classification under category
  description: string;
  estimatedAge: string;
  material: string;
  dimensions: string;
  quantity?: number; // number of identical/grouped items this record represents (default 1)
  condition: 'Mint' | 'Good' | 'Fair' | 'Poor' | 'Damaged';
  estimatedValue: number; // for insurance
  originalLocation: string; // Palace origin room - mandatory return at lease end
  currentLocation: string;  // Where it is now
  status: 'On Display' | 'In Storage' | 'Under Maintenance' | 'Damaged' | 'Reserved';
  photos: string[]; // URLs or Base64 elements
  handlingNotes: string;
  conservationNotes?: string;
  driveLink?: string; // Google Drive folder link for this item's room (from bulk import)
  inspectionHistory?: {
    id: string;
    date: string;
    inspector: string;
    notes: string;
    photoUrl: string;
    condition: string;
  }[];
  lastInspectedDate: string; // Conservation inspection reminders
  addedDate: string;
  lastUpdatedDate: string;
  addedBy: string;
  lastUpdatedBy: string;
  movementHistory: MovementLog[];
  pendingSync?: boolean;
  tempId?: string;
  story?: string;
}

export interface Staff {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl?: string;
  joinedDate: string;
  lastActive: string;
}

export interface TeamActivity {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: 'add' | 'edit' | 'move' | 'delete' | 'import';
  artifactName: string;
  artifactId: string;
  timestamp: string;
  details: string;
}

// A single assigned task in the staff duty log — e.g. "check and upload the
// latest photo of the Damascus Sabre" — with an optional link back to the
// specific artifact it concerns.
export interface Duty {
  id: string;
  assignedToName: string;
  task: string;
  relatedItemId?: string;
  relatedItemName?: string;
  status: 'Pending' | 'Completed';
  assignedDate: string;
  assignedBy: string;
  dueDate?: string;
  completedDate?: string;
  notes?: string;
}
