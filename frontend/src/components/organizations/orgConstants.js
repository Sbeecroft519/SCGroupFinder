import { Stethoscope, Shield, Truck, Pickaxe, Users, Building2 } from 'lucide-react';
export const SPECIALTIES = [{
  icon: Stethoscope,
  label: 'Medical / Rescue',
  color: '#ff4466'
}, {
  icon: Shield,
  label: 'Security',
  color: '#00f0ff'
}, {
  icon: Shield,
  label: 'Escort',
  color: '#00f0ff'
}, {
  icon: Truck,
  label: 'Cargo',
  color: '#00ff88'
}, {
  icon: Pickaxe,
  label: 'Mining',
  color: '#ffd700'
}, {
  icon: Pickaxe,
  label: 'Salvage',
  color: '#ffd700'
}, {
  icon: Users,
  label: 'New Player Help',
  color: '#c977ff'
}, {
  icon: Building2,
  label: 'Events',
  color: '#ff9900'
}, {
  icon: Building2,
  label: 'Roleplay',
  color: '#ff9900'
}, {
  icon: Shield,
  label: 'Combat',
  color: '#ff6600'
}, {
  icon: Users,
  label: 'Training',
  color: '#c977ff'
}, {
  icon: Building2,
  label: 'Exploration',
  color: '#00f0ff'
}];
export const SPECIALTY_LABELS = SPECIALTIES.map(s => s.label);
export const REGIONS = ['USA', 'Europe', 'Australia', 'Asia', 'Global'];
export const SYSTEMS = ['Stanton', 'Pyro', 'Nyx'];
export const TIMINGS = ['now', 'future'];
export const ALERT_CATEGORIES = ['MEDICAL', 'COMBAT', 'CARGO', 'MINING', 'SALVAGE', 'ESCORT', 'LFG', 'OTHER'];
export const FEATURES = ['Public organization profiles', 'Org specialties: Medical, Rescue, Security, Cargo, Mining, Salvage', 'Discord alerts for matching contracts', 'Rescue-safe dispatch alerts that protect private patient location data', 'Region, system, timing, and category filters', 'Future org reputation and dispatch tools'];
