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
  category: 
    | 'Weaponry & Armor'
    | 'Artwork & Paintings'
    | 'Furniture'
    | 'Textiles & Carpets'
    | 'Ceramics & Pottery'
    | 'Metalwork'
    | 'Religious & Ceremonial'
    | 'Manuscripts & Books'
    | 'Jewelry & Ornaments'
    | 'Other';
  description: string;
  estimatedAge: string;
  material: string;
  dimensions: string;
  condition: 'Mint' | 'Good' | 'Fair' | 'Poor' | 'Damaged';
  estimatedValue: number; // for insurance
  originalLocation: string; // Palace origin room - mandatory return at lease end
  currentLocation: string;  // Where it is now
  status: 'On Display' | 'In Storage' | 'Under Maintenance' | 'Damaged' | 'Reserved';
  photos: string[]; // URLs or Base64 elements
  handlingNotes: string;
  conservationNotes?: string;
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
