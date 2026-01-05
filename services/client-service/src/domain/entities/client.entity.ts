// Client Entity - Domain Layer -> Mimicking Auth Service Structure

export type Gender = 'male' | 'female' | 'other';
export type MaritalStatus = 'single' | 'married' | 'divorced' | 'widowed';
export type ClientSource = 'manual' | 'website' | 'import' | 'ocr';
export type BirthTimeAccuracy = 'exact' | 'approximate' | 'rectified' | 'unknown';
export type RelationshipType = 'spouse' | 'child' | 'parent' | 'sibling' | 'grandparent' | 'grandchild' | 'in_law' | 'uncle_aunt' | 'nephew_niece' | 'cousin' | 'other';
export type ConsultationType = 'general' | 'career' | 'marriage' | 'health' | 'business' | 'muhurta' | 'compatibility' | 'annual' | 'transit' | 'other';
export type ConsultationStatus = 'completed' | 'pending_follow_up' | 'closed';
export type ChartType = 'D1' | 'D2' | 'D3' | 'D4' | 'D7' | 'D9' | 'D10' | 'D12' | 'D16' | 'D20' | 'D24' | 'D27' | 'D30' | 'D40' | 'D45' | 'D60' | 'transit' | 'dasha' | 'ashtakavarga' | 'sudarshana' | 'kp_chart';
export type RemedyType = 'gemstone' | 'mantra' | 'puja' | 'charity' | 'lifestyle' | 'yantra' | 'fasting' | 'other';
export type RemedyStatus = 'prescribed' | 'in_progress' | 'completed' | 'discontinued';
export type ImportStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'partially_completed';
export type ImportType = 'excel' | 'csv' | 'ocr';

export interface Client {
    id: string;
    tenantId: string;
    clientCode: string;
    fullName: string;
    phonePrimary: string | null;
    phoneSecondary: string | null;
    email: string | null;
    photoUrl: string | null;
    birthDate: Date | null;
    birthTime: Date | null;
    birthPlace: string | null;
    birthLatitude: number | null; // Decimal -> number in TS
    birthLongitude: number | null;
    birthTimezone: string | null;
    birthTimeKnown: boolean;
    birthTimeAccuracy: BirthTimeAccuracy;
    gender: Gender | null;
    maritalStatus: MaritalStatus | null;
    occupation: string | null;
    businessDetails: string | null;
    currentSituation: string | null;
    specialConsiderations: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    country: string | null;
    tags: any | null;
    metadata: any | null;
    source: ClientSource;
    createdBy: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}

export interface ClientFamilyLink {
    id: string;
    tenantId: string;
    clientId: string;
    relatedClientId: string;
    relationshipType: RelationshipType;
    relationshipLabel: string | null;
    notes: string | null;
    createdAt: Date;
}

export interface ClientConsultation {
    id: string;
    tenantId: string;
    clientId: string;
    bookingId: string | null;
    reportId: string | null;
    consultationType: ConsultationType;
    sessionNotes: string | null;
    keyObservations: string | null;
    followUpDate: Date | null;
    status: ConsultationStatus;
    consultationDate: DateTime; // or Date
    createdAt: Date;
    updatedAt: Date;
}
// Using Date for DateTime as is standard in JS/TS
export type DateTime = Date;

export interface ClientSavedChart {
    id: string;
    tenantId: string;
    clientId: string;
    chartType: ChartType;
    chartName: string | null;
    chartData: any;
    chartConfig: any | null;
    chartImageUrl: string | null;
    calculatedAt: Date;
    createdAt: Date;
}

export interface ClientNote {
    id: string;
    tenantId: string;
    clientId: string;
    noteContent: string;
    isPinned: boolean;
    createdBy: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface ClientRemedy {
    id: string;
    tenantId: string;
    clientId: string;
    consultationId: string | null;
    remedyType: RemedyType;
    remedyTitle: string;
    remedyDescription: string | null;
    instructions: string | null;
    startDate: Date | null;
    endDate: Date | null;
    status: RemedyStatus;
    followUpNotes: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface ClientImport {
    id: string;
    tenantId: string;
    fileName: string;
    fileUrl: string;
    importType: ImportType;
    status: ImportStatus;
    totalRecords: number;
    successfulRecords: number;
    failedRecords: number;
    duplicateRecords: number;
    columnMapping: any | null;
    errors: any | null;
    createdBy: string | null;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
}
