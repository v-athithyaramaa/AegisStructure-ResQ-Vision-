export interface Assessment {
  id: string;
  building_name: string;
  inspector_id: string;
  latitude: number;
  longitude: number;
  placard_status: string;
  residual_capacity_score: number;
  tilt_degrees: number;
  detected_defects: Defect[];
  collapse_radius_meters: number;
  incident_action_plan: string;
  structural_archetype: string;
  created_at?: string;
  confidence_score?: number;
  override_badge_id?: string;
  override_justification?: string;
}

export interface Defect {
  element: string;
  failure: string;
  severity: number;
  rebar_exposed: boolean;
}
