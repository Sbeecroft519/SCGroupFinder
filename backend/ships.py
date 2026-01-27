# NavCom - Golden Truth Ship Data
# This is the canonical source for all ship specifications

SHIP_SPECS = {
    "Aurora MR": {"scu": 0, "type": "Starter/Light Fighter"},
    "Aurora CL": {"scu": 6, "type": "Starter/Light Freight"},
    "Mustang Alpha": {"scu": 4, "type": "Starter/Light Freight"},
    "C8X Pisces Expedition": {"scu": 4, "type": "Snub/Pathfinder"},
    "Cutter": {"scu": 4, "type": "Starter/Light Freight"},
    "Avenger Titan": {"scu": 8, "type": "Light Freight"},
    "Nomad": {"scu": 24, "type": "Light Freight"},
    "Cutlass Black": {"scu": 46, "type": "Medium Freight"},
    "Freelancer": {"scu": 66, "type": "Medium Freight"},
    "Freelancer MAX": {"scu": 120, "type": "Heavy Freight"},
    "Spirit C1": {"scu": 64, "type": "Medium Freight"},
    "Zeus Mk II CL": {"scu": 128, "type": "Medium Freight"},
    "Mercury Star Runner": {"scu": 114, "type": "Data/Freight"},
    "Raft": {"scu": 96, "type": "Industrial Freight"},
    "Constellation Andromeda": {"scu": 96, "type": "Gunship/Freight"},
    "Constellation Taurus": {"scu": 174, "type": "Heavy Freight"},
    "Corsair": {"scu": 72, "type": "Exploration/Gunship"},
    "Caterpillar": {"scu": 576, "type": "Heavy Cargo"},
    "C2 Hercules": {"scu": 696, "type": "Heavy Cargo"},
    "M2 Hercules": {"scu": 522, "type": "Military Transport"},
    "A2 Hercules": {"scu": 216, "type": "Bomber/Gunship"},
    "Hull A": {"scu": 64, "type": "Light Cargo"},
    "Hull C": {"scu": 4608, "type": "Super Heavy Cargo"},
    "Carrack": {"scu": 456, "type": "Exploration"},
    "890 Jump": {"scu": 388, "type": "Capital/Luxury"},
    "Vulture": {"scu": 12, "type": "Salvage"},
    "Reclaimer": {"scu": 420, "type": "Heavy Salvage"},
    "Prospector": {"scu": 32, "type": "Mining"},
    "MOLE": {"scu": 96, "type": "Mining"}
}

# Ship categories for filtering
SHIP_CATEGORIES = {
    "cargo": ["Aurora CL", "Mustang Alpha", "Cutter", "Avenger Titan", "Nomad", 
              "Cutlass Black", "Freelancer", "Freelancer MAX", "Spirit C1", 
              "Zeus Mk II CL", "Mercury Star Runner", "Raft", "Constellation Taurus",
              "Caterpillar", "C2 Hercules", "Hull A", "Hull C"],
    "combat": ["Aurora MR", "Cutlass Black", "Constellation Andromeda", "Corsair",
               "M2 Hercules", "A2 Hercules"],
    "mining": ["Prospector", "MOLE"],
    "salvage": ["Vulture", "Reclaimer"],
    "exploration": ["C8X Pisces Expedition", "Corsair", "Carrack"],
    "luxury": ["890 Jump"]
}

def get_ship_scu(ship_name: str) -> int:
    """Get SCU capacity for a ship"""
    return SHIP_SPECS.get(ship_name, {}).get("scu", 0)

def get_ship_type(ship_name: str) -> str:
    """Get ship type classification"""
    return SHIP_SPECS.get(ship_name, {}).get("type", "Unknown")

def get_all_ships() -> list:
    """Get list of all ship names"""
    return list(SHIP_SPECS.keys())

def get_ships_by_category(category: str) -> list:
    """Get ships filtered by category"""
    return SHIP_CATEGORIES.get(category, [])
