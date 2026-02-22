

export interface Gym {
  id: string; // UUID
  name: string;
  ownerEmail: string;
  formattedGymId: string; // 8-character unique ID
  creationDate: string; // ISO string
  status: 'active' | 'inactive' | 'inactive soon';
  activeMembersCount?: number; // New: For per-gym analytics
  monthlyRevenue?: number; // New: For per-gym analytics
}

export interface Plan {
  id: string; // UUID
  gym_id?: string; // FK to gyms table
  plan_name?: string;
  price: number; // numeric in DB, maps to number in JS/TS
  duration_days?: number; // Changed from duration_months
  description?: string; // Added description
  is_active?: boolean; // This 'is_active' is for the plan itself
  created_at?: string; // ISO string
}

export interface Member {
  id: string; // UUID
  gym_id?: string; // FK to gyms table
  plan_id?: string; // FK to plans table
  member_id?: string; // Custom member identifier
  name?: string;
  email?: string;
  membership_status?: string; // e.g., 'active', 'inactive', 'expired'
  created_at?: string; // ISO string
  age?: number;
  phone_number?: string;
  join_date?: string; // ISO string
  expiry_date?: string; // ISO string
  plans?: { plan_name?: string; price?: number } | null; // Updated to include plan_name
}

export interface SuperAdmin {
  id: string; // UUID
  email: string;
  password_hash: string; // In a real app, this should be a securely hashed password
  created_at?: string; // ISO string
  updated_at?: string; // ISO string
}

export interface CheckIn {
  id: string; // UUID
  gym_id?: string; // FK to gyms table
  member_id?: string; // FK to members table
  created_at?: string; // ISO string
  members?: { name?: string; email?: string } | null;
}

export interface Announcement {
  id: string; // UUID
  gym_id?: string; // FK to gyms table
  title?: string;
  content?: string; // Changed from message
  created_at?: string; // ISO string
}

export interface GymRequest {
  id: string;
  gym_name: string;
  owner_name: string;
  email: string;
  phone: string;
  city: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}
