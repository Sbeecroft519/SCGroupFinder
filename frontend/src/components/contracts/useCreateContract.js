import { useState, useMemo } from 'react';
import { generateTitle } from './contractHelpers.js';
import { CATEGORY_LABELS } from '../../constants/badges';
import axios from 'axios';
import { API } from '../../App';
export const useCreateContract = ({
  myShard,
  setContracts,
  setShowCreate
}) => {
  const [isMultiCrew, setIsMultiCrew] = useState(false);
  const [manifest, setManifest] = useState([]);
  const [basePayout, setBasePayout] = useState(50000);
  const [duration, setDuration] = useState(60);
  // Named crew roles with a seat count each — the multicrew flow's source of truth.
  const [crewRoles, setCrewRoles] = useState([{
    name: 'Pilot',
    count: 1
  }]);
  const [crewPayTotal, setCrewPayTotal] = useState(50000);
  const [newContract, setNewContract] = useState({
    category: 'COMBAT',
    title: '',
    description: '',
    // Payment (global)
    payment_amount: '',
    compensation_type: 'Flat Fee',
    split_profits: false,
    // Legacy location fields (kept for backward compatibility)
    system: 'Stanton',
    planet: '',
    location: '',
    // Timing
    timing_type: 'now',
    scheduled_date: '',
    scheduled_time: '',
    scheduled_timezone: 'UTC',
    // Simplified meeting location
    meeting_visibility: 'public',
    meeting_system: '',
    meeting_major_location: '',
    // Medical / Rescue PUBLIC fields
    rescue_bleedout_minutes: 30,
    rescue_injury_tier: 'Unknown',
    rescue_pvp_area: 'Unknown',
    rescue_hostile_npcs: 'Unknown',
    rescue_aa_turrets: 'Unknown',
    rescue_needs_food_hydration: 'Unknown',
    // Medical / Rescue PRIVATE fields
    rescue_exact_location: '',
    rescue_body_location: '',
    rescue_private_notes: '',
    // Group join mode (multi-join events)
    join_mode: '',
    // '' = use server default, otherwise 'single' | 'multi'
    max_participants: 8
  });
  const totalSeats = crewRoles.reduce((sum, r) => sum + (parseInt(r.count) || 0), 0);
  const perSeatPayout = totalSeats > 0 ? Math.floor((parseInt(crewPayTotal) || 0) / totalSeats) : 0;
  const crewManifest = useMemo(() => crewRoles.flatMap(r => Array.from({
    length: Math.max(0, parseInt(r.count) || 0)
  }, () => ({
    role: String(r.name || 'Crew').trim() || 'Crew',
    payout: perSeatPayout,
    status: 'OPEN',
    applicant_id: null,
    bids: []
  }))), [crewRoles, perSeatPayout]);
  const isLfg = newContract.category === 'LFG';
  const isMedical = newContract.category === 'MEDICAL';
  const isFuture = newContract.timing_type === 'future';
  const showPaymentField = !isLfg && !isMultiCrew && newContract.compensation_type === 'Flat Fee' && !newContract.split_profits;
  const effectiveJoinMode = newContract.join_mode || (isLfg || isFuture ? 'multi' : 'single');
  const isMultiJoin = effectiveJoinMode === 'multi';
  const isContractValid = () => {
    const c = newContract;
    // Title always required
    if (!c.title) return false;
    // Future scheduling requires date+time
    if (c.timing_type === 'future' && (!c.scheduled_date || !c.scheduled_time)) return false;
    // Public meeting location requires system — but multi-crew hides the meeting-location UI
    // and coordinates via manifest slots, so don't gate the submit on it.
    if (!isMultiCrew && c.meeting_visibility === 'public' && !c.meeting_system) return false;

    // Medical / Rescue
    if (isMedical) {
      if (!c.meeting_system) return false;
      if (!c.rescue_exact_location) return false;
      if (!c.payment_amount || isNaN(parseInt(c.payment_amount))) return false;
      return true;
    }
    if (isLfg) return true;
    if (isMultiCrew) return crewManifest.length > 0 && crewRoles.every(r => String(r.name || '').trim().length > 0);
    if (showPaymentField && (!c.payment_amount || isNaN(parseInt(c.payment_amount)))) return false;
    return true;
  };
  const handleCreateContract = async () => {
    if (!isContractValid()) return;
    const c = newContract;
    const title = generateTitle(c);
    const cat = CATEGORY_LABELS[c.category] || 'Contract';
    const paymentAmount = isMedical || showPaymentField ? parseInt(c.payment_amount) || 0 : 0;

    // Build display location string (legacy compatibility + cards)
    let locationStr;
    if (c.meeting_visibility === 'disclosed_on_acceptance') {
      locationStr = 'Disclosed on Acceptance';
    } else if (c.meeting_system && c.meeting_major_location) {
      locationStr = `${c.meeting_system} - ${c.meeting_major_location}`;
    } else if (c.meeting_system) {
      locationStr = c.meeting_system;
    } else {
      locationStr = '';
    }

    // Convert scheduled date+time to ISO UTC if future timing
    let scheduledIso = null;
    if (c.timing_type === 'future' && c.scheduled_date && c.scheduled_time) {
      // Build ISO assuming user's local browser timezone if no tz selected, else UTC
      try {
        scheduledIso = new Date(`${c.scheduled_date}T${c.scheduled_time}:00`).toISOString();
      } catch (e) {
        scheduledIso = null;
      }
    }
    const contractData = {
      title: c.title || (isMultiCrew ? `Multi-Crew: ${cat} Operation` : title),
      description: c.description || (isMultiCrew ? `Multi-crew ${cat.toLowerCase()} operation requiring ${crewManifest.length} crew members.` : null),
      category: c.category,
      compensation_type: isLfg ? 'LFG' : isMedical ? 'Flat Fee' : c.compensation_type,
      payment_amount: isLfg ? 0 : paymentAmount,
      split_profits: isLfg || isMedical ? false : c.split_profits,
      // Legacy location fields kept for backward compatibility
      system: c.meeting_system || c.system,
      planet: c.meeting_major_location || null,
      location: locationStr,
      shard: myShard,
      // Multi-crew (disabled for LFG and Medical)
      is_multi_crew: isLfg || isMedical ? false : isMultiCrew,
      manifest: !isLfg && !isMedical && isMultiCrew ? crewManifest : null,
      crew_roles: !isLfg && !isMedical && isMultiCrew ? crewRoles.map(r => ({
        name: String(r.name || 'Crew').trim() || 'Crew',
        count: Math.max(1, parseInt(r.count) || 1)
      })) : null,
      // Listing duration: medical uses bleed-out as duration; "now" non-medical uses chosen duration; future uses 60 (placeholder, expiry handled by scheduled_start_at)
      duration_minutes: isMedical ? parseInt(c.rescue_bleedout_minutes) || 30 : c.timing_type === 'now' ? duration : 60,
      // New: timing
      timing_type: c.timing_type,
      scheduled_start_at: scheduledIso,
      scheduled_timezone: c.scheduled_timezone || null,
      // New: meeting location
      meeting_visibility: c.meeting_visibility,
      meeting_system: c.meeting_system || null,
      meeting_major_location: c.meeting_major_location || null,
      // Group join mode (multi-join events)
      join_mode: c.join_mode || null,
      // null lets server pick the smart default
      max_participants: isMultiJoin ? Math.max(2, Math.min(50, parseInt(c.max_participants) || 8)) : null
    };
    if (isMedical) {
      Object.assign(contractData, {
        rescue_bleedout_minutes: parseInt(c.rescue_bleedout_minutes) || 30,
        rescue_injury_tier: c.rescue_injury_tier,
        rescue_pvp_area: c.rescue_pvp_area,
        rescue_hostile_npcs: c.rescue_hostile_npcs,
        rescue_aa_turrets: c.rescue_aa_turrets,
        rescue_needs_food_hydration: c.rescue_needs_food_hydration,
        rescue_exact_location: c.rescue_exact_location,
        rescue_body_location: c.rescue_body_location,
        rescue_private_notes: c.rescue_private_notes
      });
    }
    try {
      const response = await axios.post(`${API}/contracts`, contractData);
      setContracts(prev => [response.data, ...prev]);
      setShowCreate(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create contract:', error);
    }
  };
  const resetForm = () => {
    setNewContract({
      category: 'COMBAT',
      title: '',
      description: '',
      compensation_type: 'Flat Fee',
      split_profits: false,
      payment_amount: '',
      system: 'Stanton',
      planet: '',
      location: '',
      timing_type: 'now',
      scheduled_date: '',
      scheduled_time: '',
      scheduled_timezone: 'UTC',
      meeting_visibility: 'public',
      meeting_system: '',
      meeting_major_location: '',
      rescue_bleedout_minutes: 30,
      rescue_injury_tier: 'Unknown',
      rescue_pvp_area: 'Unknown',
      rescue_hostile_npcs: 'Unknown',
      rescue_aa_turrets: 'Unknown',
      rescue_needs_food_hydration: 'Unknown',
      rescue_exact_location: '',
      rescue_body_location: '',
      rescue_private_notes: '',
      join_mode: '',
      max_participants: 8
    });
    setManifest([]);
    setIsMultiCrew(false);
    setBasePayout(50000);
    setDuration(60);
    setCrewRoles([{
      name: 'Pilot',
      count: 1
    }]);
    setCrewPayTotal(50000);
  };
  return {
    isMultiCrew,
    setIsMultiCrew,
    manifest,
    setManifest,
    basePayout,
    setBasePayout,
    crewRoles,
    setCrewRoles,
    crewPayTotal,
    setCrewPayTotal,
    totalSeats,
    perSeatPayout,
    crewManifest,
    duration,
    setDuration,
    newContract,
    setNewContract,
    isLfg,
    isMedical,
    isFuture,
    showPaymentField,
    isMultiJoin,
    isContractValid,
    handleCreateContract
  };
};
