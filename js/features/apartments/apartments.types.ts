/**
 * Apartments Types - Apartment related type definitions
 */

export interface Apartment {
    id?: string;
    apartmentNo: number;
    residentName: string;
    contactNumber: string;
    email?: string;
    residentCount: number;
    isOwner: boolean;
    moveInDate: string; // ISO date string
    balance: number;
    notes?: string;
}

export interface ApartmentFormData {
    residentName: string;
    contactNumber: string;
    email?: string;
    residentCount: number;
    isOwner: boolean;
    moveInDate: string;
    notes?: string;
}
