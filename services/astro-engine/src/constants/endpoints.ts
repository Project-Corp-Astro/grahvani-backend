// =============================================================================
// EXTERNAL ASTRO ENGINE ENDPOINT MAPPINGS
// =============================================================================



/***********************************Lahiri Ayanamsa System Endpoints******************************************
 * Base: /{system}/ where system = 'lahiri'
 */
export const LAHIRI_ENDPOINTS = {
    // Natal & Transit
    NATAL: '/lahiri/natal',
    TRANSIT: '/lahiri/transit',
    MOON_CHART: '/lahiri/calculate_moon_chart',
    SUN_CHART: '/lahiri/calculate_sun_chart',
    SUDARSHAN_CHAKRA: '/lahiri/calculate_sudarshan_chakra',

    // Divisional Charts (D2-D60)
    D2_HORA: '/lahiri/calculate_d2_hora',
    D3_DREKKANA: '/lahiri/calculate_d3',
    D4_CHATURTHAMSHA: '/lahiri/calculate_d4',
    D7_SAPTAMSHA: '/lahiri/calculate_d7_chart',
    D9_NAVAMSA: '/lahiri/navamsa',
    D10_DASAMSA: '/lahiri/calculate_d10',
    D12_DWADASAMSA: '/lahiri/calculate_d12',
    D16_SHODASAMSA: '/lahiri/calculate_d16',
    D20_VIMSHAMSA: '/lahiri/calculate_d20',
    D24_CHATURVIMSHAMSA: '/lahiri/calculate_d24',
    D27_SAPTAVIMSHAMSA: '/lahiri/calculate_d27',
    D30_TRIMSHAMSA: '/lahiri/calculate_d30',
    D40_KHAVEDAMSA: '/lahiri/calculate_d40',
    D45_AKSHAVEDAMSA: '/lahiri/calculate_d45',
    D60_SHASHTIAMSA: '/lahiri/calculate_d60',
    D6_SHASHTAMSHA: '/lahiri/d6_shashtamsha',
    D150_NADIAMSHA: '/lahiri/d150-nadiamsha',

    // Lagna Charts
    ARUDHA_LAGNA: '/lahiri/calculate_arudha_lagna',
    BHAVA_LAGNA: '/lahiri/calculate_bhava_lagna',
    HORA_LAGNA: '/lahiri/calculate_hora_lagna',
    SRIPATHI_BHAVA: '/lahiri/calculate_sripathi_bhava',
    KP_BHAVA: '/lahiri/calculate_kp_bhava',
    EQUAL_BHAVA: '/lahiri/calculate_equal_bhava_lagna',
    KARKAMSHA_D1: '/lahiri/calculate_d1_karkamsha',
    KARKAMSHA_D9: '/lahiri/calculate_karkamsha_d9',
    MANDI: '/lahiri/calculate_mandi', // NEW
    GULIKA: '/lahiri/calculate_gulika', // NEW

    // Ashtakavarga
    BHINNA_ASHTAKAVARGA: '/lahiri/calculate_binnatakvarga',
    SARVA_ASHTAKAVARGA: '/lahiri/calculate_sarvashtakavarga',
    SHODASHA_VARGA_SUMMARY: '/lahiri/shodasha_varga_summary',

    // Dasha
    ANTAR_DASHA: '/lahiri/calculate_antar_dasha',
    PRATYANTAR_DASHA: '/lahiri/calculate_maha_antar_pratyantar_dasha',
    SOOKSHMA_DASHA: '/lahiri/calculate_antar_pratyantar_sookshma_dasha',
    PRANA_DASHA: '/lahiri/calculate_sookshma_prana_dashas',

    // Extended Dashas
    ASHTOTTARI_ANTAR: '/lahiri/calculate_ashtottari_antar',
    ASHTOTTARI_PRATYANTAR: '/lahiri/calculate_ashtottari_prathyantar',
    TRIBHAGI: '/lahiri/calculate_tribhagi_dasha',
    TRIBHAGI_40: '/lahiri/tribhagi-dasha-40',
    SHODASHOTTARI: '/lahiri/shodashottari-dasha',
    DWADASHOTTARI: '/lahiri/dwadashottari-dasha',
    CHATURSHITISAMA: '/lahiri/calculate_Chaturshitisama_dasha',
    SATABDIKA: '/lahiri/calculate_satabdika',
    PANCHOTTARI: '/lahiri/calculate-panchottari-dasha',
    DWISAPTATI: '/lahiri/calculate_dwisaptati',
    SHASTIHAYANI: '/lahiri/calculate_shastihayani',
    SHATTRIMSHATSAMA: '/lahiri/calculate_Shattrimshatsama_dasha',

    // Dasha Reports
    DASHA_3MONTHS: '/lahiri/calculate_vimshottari_dasha_3months',
    DASHA_6MONTHS: '/lahiri/calculate_vimshottari_dasha_6months',
    DASHA_REPORT_1YEAR: '/lahiri/dasha_report_1year',
    DASHA_REPORT_2YEARS: '/lahiri/dasha_report_2years',
    DASHA_REPORT_3YEARS: '/lahiri/dasha_report_3years',

    // Panchanga
    PANCHANGA: '/panchanga',
    CHOGHADIYA: '/choghadiya_times',
    HORA_TIMES: '/hora_times',
    LAGNA_TIMES: '/lagna_times',
    MUHURAT: '/muhurat',
    PANCHANGA_MONTH: '/panchanga/month',

    // Compatibility & Numerology
    SYNASTRY: '/lahiri/synastry',
    COMPOSITE: '/lahiri/composite',
    PROGRESSED: '/lahiri/progressed',
    CHALDEAN_NUMEROLOGY: '/lahiri/chaldean_numerology',
    LO_SHU_GRID: '/lahiri/lo_shu_grid_numerology',
    PERSON_NUMEROLOGY: '/lahiri/person_numerology',
    GUNA_MILAN: '/lahiri/guna-milan',

    // Yogas
    GAJA_KESARI_YOGA: '/lahiri/comprehensive_gaja_kesari',
    GURU_MANGAL_YOGA: '/lahiri/comprehensive_guru_mangal',
    GURU_MANGAL_ONLY: '/lahiri/guru-mangal-only',
    BUDHA_ADITYA_YOGA: '/lahiri/budha-aditya-yoga',
    CHANDRA_MANGAL_YOGA: '/lahiri/chandra-mangal-yoga',
    RAJ_YOGA: '/lahiri/raj-yoga',
    PANCHA_MAHAPURUSHA_YOGA: '/lahiri/pancha-mahapurusha-yogas',
    DARIDRA_YOGA: '/lahiri/daridra-analysis',
    DHAN_YOGA: '/lahiri/dhan-yoga-analysis',
    MALEFIC_YOGAS: '/lahiri/malefic_yogas',
    YOGA_ANALYSIS: '/lahiri/yoga-analysis',
    SPECIAL_YOGAS: '/lahiri/special-yogas',
    SPIRITUAL_YOGAS: '/lahiri/spiritual_prosperity_yogas',
    SHUBH_YOGAS: '/lahiri/shubh-yogas',
    VIPARITHA_RAJ_YOGA: '/lahiri/viparitha-raja-yoga',
    KALPADRUMA_YOGA: '/lahiri/kalpadruma-yoga',
    KALA_SARPA_DOSHA: '/lahiri/kala-sarpa-fixed',

    // Doshas
    ANGARAK_DOSHA: '/lahiri/calculate-angarak-dosha',
    GURU_CHANDAL_DOSHA: '/lahiri/guru-chandal-analysis',
    SHRAPIT_DOSHA: '/lahiri/calculate-shrapit-dosha',
    SADE_SATI: '/lahiri/calculate-sade-sati',
    PITRA_DOSHA: '/lahiri/pitra-dosha',

    // Remedies & Charts
    YANTRA_REMEDIES: '/lahiri/yantra-recommendations',
    MANTRA_REMEDIES: '/lahiri/mantra-analysis',
    VEDIC_REMEDIES: '/lahiri/vedic_remedies',
    GEMSTONE_REMEDIES: '/lahiri/calculate-gemstone',
    CALCULATE_CHART: '/lahiri/calculate-chart',
    LAL_KITAB_REMEDIES: '/lahiri/lal-kitab-remedies',
    CHART_WITH_REMEDIES: '/lahiri/chart-with-remedies',

    // Shadbala
    SHADBALA: '/lahiri/calculate_shadbala',

    // Extra Charts
    D40_CHART: '/lahiri/d40-chart',

    // New integrated routes
    GL_CHART: '/lahiri/calculate_gl_chart',
    KARAKA_STRENGTH: '/lahiri/calculate_karaka_strength',
    // NOTE: birth_panchanga uses PANCHANGA endpoint (same /panchanga path)
} as const;



/********************************************* KP (Krishnamurti Paddhati) System Endpoints ******************************************/
export const KP_ENDPOINTS = {
    // Planets & Cusps
    PLANETS_CUSPS: '/kp/cusps_chart',
    RULING_PLANETS: '/kp/ruling-planets',
    BHAVA_DETAILS: '/kp/calculate_bhava_details',
    SIGNIFICATIONS: '/kp/calculate_house_significations',
    PLANET_SIGNIFICATORS: '/kp/calculate_kp_significators', // UPDATED - Renamed from planets-significators to match Python

    // Advanced Interlinks & Nadi
    CUSPAL_INTERLINK_ADV: '/kp/cuspal_interlink_advanced_ssl', // NEW
    CUSPAL_INTERLINK: '/kp/calculate_kp_cuspal_interlink', // NEW
    CUSPAL_INTERLINK_SL: '/kp/cuspal_interl_SL', // NEW
    NAKSHATRA_NADI: '/kp/nakshatra_nadi', // NEW
    FORTUNA: '/kp/fortuna', // NEW

    // Dasha (Vimshottari)
    MAHA_ANTAR_DASHA: '/kp/calculate_maha_antar_dasha',
    PRATYANTAR_DASHA: '/kp/calculate_maha_antar_pratyantar_dasha',
    SOOKSHMA_DASHA: '/kp/calculate_maha_antar_pratyantar_sooksha_dasha',
    PRANA_DASHA: '/kp/calculate_maha_antar_pratyantar_pran_dasha',
    CHARA_DASHA: '/kp/chara-dasha',

    // Horary & Varga
    HORARY: '/kp/kp_horary',
    SHODASHA_VARGA: '/kp/shodasha_varga_signs',
} as const;





/*****************************************Raman Ayanamsa System Endpoints ***************/
export const RAMAN_ENDPOINTS = {
    // Natal & Transit
    NATAL: '/raman/natal',
    TRANSIT: '/raman/transit',
    MOON_CHART: '/raman/calculate_moon_chart',
    SUN_CHART: '/raman/calculate_sun_chart',
    SUDARSHAN_CHAKRA: '/raman/calculate_sudarshan_chakra',
    SRIPATHI_BHAVA: '/raman/calculate_sripathi_bhava',

    // Divisional Charts
    D2_HORA: '/raman/calculate_d2_hora',
    D3_DREKKANA: '/raman/calculate_d3_chart',
    D4_CHATURTHAMSHA: '/raman/calculate_d4',
    D7_SAPTAMSHA: '/raman/calculate_d7_chart',
    D9_NAVAMSA: '/raman/navamsha_d9',
    D10_DASAMSA: '/raman/calculate_d10',
    D12_DWADASAMSA: '/raman/calculate_d12',
    D16_SHODASAMSA: '/raman/calculate_d16',
    D20_VIMSHAMSA: '/raman/calculate_d20',
    D24_CHATURVIMSHAMSA: '/raman/calculate_d24',
    D27_SAPTAVIMSHAMSA: '/raman/calculate_d27_chart',
    D30_TRIMSHAMSA: '/raman/calculate_d30_chart',
    D40_KHAVEDAMSA: '/raman/calculate_d40',
    D45_AKSHAVEDAMSA: '/raman/calculate_d45',
    D60_SHASHTIAMSA: '/raman/calculate_d60',

    // Lagna Charts
    ARUDHA_LAGNA: '/raman/calculate_arudha_lagna',
    BHAVA_LAGNA: '/raman/calculate_bhava_lagna',
    HORA_LAGNA: '/raman/calculate_hora_lagna',
    KP_BHAVA: '/raman/calculate_kp_bhava',
    EQUAL_BHAVA: '/raman/calculate_equal_bhava_lagna',
    KARKAMSHA_D1: '/raman/calculate_karkamsha_d1',
    KARKAMSHA_D9: '/raman/calculate_d9_karkamsha',

    // Ashtakavarga
    BHINNA_ASHTAKAVARGA: '/raman/calculate_bhinnashtakavarga',
    SARVA_ASHTAKAVARGA: '/raman/calculate_sarvashtakavarga',
    SHODASHA_VARGA: '/raman/shodasha_varga_signs',

    // Dasha
    MAHA_ANTAR_DASHA: '/raman/calculate_maha_antar_dashas',
    PRATYANTAR_DASHA: '/raman/calculate_maha_antar_pratyantar_dasha',
    SOOKSHMA_DASHA: '/raman/calculate_sookshma_dasha_raman',
    PRANA_DASHA: '/raman/calculate_raman_prana_dasha',
} as const;




/****************************************************** Western Astrology Endpoints*******************************************/
export const WESTERN_ENDPOINTS = {
    PROGRESSED: '/western/progressed',
    SYNASTRY: '/western/synastry',
    COMPOSITE: '/western/composite',
} as const;





/****************************************************** Sri Yukteswar Ayanamsa System Endpoints*******************************************/
export const YUKTESWAR_ENDPOINTS = {
    // Natal & Transit
    NATAL: '/yukteswar/calculate_d1',
    TRANSIT: '/yukteswar/calculate_transit_chart',  // Updated: was calculate_d1
    MOON_CHART: '/yukteswar/calculate_moon_chart',
    SUN_CHART: '/yukteswar/calculate_sun_chart',
    EQUAL_CHART: '/yukteswar/calculate_equal_chart',
    SUDARSHAN_CHAKRA: '/yukteswar/calculate_sudarshan_chakra',
    SHODASHA_VARGA_SUMMARY: '/yukteswar/shodasha_varga_summary',

    // Divisional Charts
    D2_HORA: '/yukteswar/calculate_d2',
    D3_DREKKANA: '/yukteswar/calculate_d3',
    D4_CHATURTHAMSHA: '/yukteswar/calculate_d4',
    D7_SAPTAMSHA: '/yukteswar/calculate_d7',
    D9_NAVAMSA: '/yukteswar/calculate_d9',
    D10_DASAMSA: '/yukteswar/calculate_d10',
    D12_DWADASAMSA: '/yukteswar/calculate_d12',
    D16_SHODASAMSA: '/yukteswar/calculate_d16',
    D20_VIMSHAMSA: '/yukteswar/calculate_d20',
    D24_CHATURVIMSHAMSA: '/yukteswar/calculate_d24',
    D27_SAPTAVIMSHAMSA: '/yukteswar/calculate_d27',
    D30_TRIMSHAMSA: '/yukteswar/calculate_d30',
    D40_KHAVEDAMSA: '/yukteswar/calculate_d40',
    D45_AKSHAVEDAMSA: '/yukteswar/calculate_d45',
    D60_SHASHTIAMSA: '/yukteswar/calculate_d60',

    // Lagna & Bhava
    ARUDHA_LAGNA: '/yukteswar/calculate_arudha_lagna',
    BHAVA_LAGNA: '/yukteswar/calculate_bhava_lagna',
    HORA_LAGNA: '/yukteswar/calculate_hora_lagna',
    SRIPATHI_BHAVA: '/yukteswar/calculate_Sripati_Bhava',
    KP_BHAVA: '/yukteswar/calculate_kp_bhava',
    GL_CHART: '/yukteswar/calculate_gl_chart',
    KARKAMSHA_D1: '/yukteswar/calculate_karakamsha_birth',
    KARKAMSHA_D9: '/yukteswar/calculate_karkamsha_d9',

    // Ashtakavarga
    BHINNA_ASHTAKAVARGA: '/yukteswar/calculate_binnashtakvarga_chart',
    SARVA_ASHTAKAVARGA: '/yukteswar/calculate_sarvashtakvarga_chart',

    // Dashas
    MAHA_ANTAR_DASHA: '/yukteswar/calculate_mahaantar_dasha',
    PRATYANTAR_DASHA: '/yukteswar/calculate_pratyantar_dasha',
    SOOKSHMA_DASHA: '/yukteswar/calculate_sookshma_dasha',
    PRANA_DASHA: '/yukteswar/calculate_prana_dasha',

    // Other Dashas
    ASHTOTTARI_ANTAR: '/yukteswar/calculate_ashtottari_antar',
    ASHTOTTARI_PRATYANTAR: '/yukteswar/calculate_ashtottari_pratyantardasha',
    TRIBHAGI: '/yukteswar/calculate_tribhgi_dasha',
    TRIBHAGI_40: '/yukteswar/calculate_tribhgi_40',
    SHODASHOTTARI: '/yukteswar/calculate_shodashottari_dasha',
    DWADASHOTTARI: '/yukteswar/calculate_dwadashottari',
    DWISAPTATISAMA: '/yukteswar/calculate_dwisaptatisama',
    SHASTIHAYANI: '/yukteswar/calculate_shastihayani',
    SHATTRIMSHATSAMA: '/yukteswar/calculate_shattrimshatsama',
    PANCHOTTARI: '/yukteswar/calculate_panchottari',
    SATABDIKA: '/yukteswar/calculate_satabdika',
    CHATURSHITISAMA: '/yukteswar/calculate_chaturshitisama_dasha',
} as const;

/************************************************Divisional chart type to endpoint mapping*******************************************/
export const DIVISIONAL_CHART_MAP: Record<string, string> = {
    'd2': 'calculate_d2_hora',
    'd3': 'calculate_d3',
    'd4': 'calculate_d4',
    'd7': 'calculate_d7_chart',
    'd9': 'navamsa',
    'd10': 'calculate_d10',
    'd12': 'calculate_d12',
    'd16': 'calculate_d16',
    'd20': 'calculate_d20',
    'd24': 'calculate_d24',
    'd27': 'calculate_d27',
    'd30': 'calculate_d30',
    'd40': 'calculate_d40',
    'd45': 'calculate_d45',
    'd60': 'calculate_d60',
    'd6': 'd6_shashtamsha',
    'd150': 'd150-nadiamsha',
};

/************************************************Dasha level to endpoint mapping*******************************************/
export const DASHA_LEVEL_MAP: Record<string, string> = {
    'mahadasha': '/kp/calculate_maha_antar_dasha',
    'antardasha': '/kp/calculate_maha_antar_dasha',
    'pratyantardasha': '/kp/calculate_maha_antar_pratyantar_dasha',
    'sookshma': '/kp/calculate_maha_antar_pratyantar_sooksha_dasha',
    'prana': '/kp/calculate_maha_antar_pratyantar_pran_dasha',
};
