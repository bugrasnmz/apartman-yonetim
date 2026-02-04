/**
 * Apartments Service - Apartment management operations
 */

import { AppState } from '../../modules/state.js';
import { COLLECTIONS, APP_CONFIG } from '../../firebase-config.js';
import { FirebaseService } from '../../shared/services/firebase.service.js';
import { toastSuccess, toastError } from '../../shared/ui/toast.js';
import { eventBus, EVENTS } from '../../core/events.js';
import type { Apartment, ApartmentFormData } from './apartments.types.js';

const TOTAL_APARTMENTS = APP_CONFIG.TOTAL_APARTMENTS;

/**
 * Apartments Service - CRUD operations for apartments
 */
export const ApartmentsService = {
    /**
     * Get all apartments sorted by number
     */
    getAll(): Apartment[] {
        return [...AppState.apartments].sort((a, b) => a.apartmentNo - b.apartmentNo);
    },

    /**
     * Get apartment by number
     */
    getByNumber(apartmentNo: number): Apartment | undefined {
        return AppState.apartments.find(a => a.apartmentNo === apartmentNo);
    },

    /**
     * Get apartment by ID
     */
    getById(id: string): Apartment | undefined {
        return AppState.apartments.find(a => a.id === id);
    },

    /**
     * Update apartment data
     */
    async update(id: string, data: Partial<ApartmentFormData>): Promise<boolean> {
        const index = AppState.apartments.findIndex(a => a.id === id);

        if (index !== -1) {
            const updated = { ...AppState.apartments[index], ...data };
            AppState.apartments[index] = updated;
            await FirebaseService.save(COLLECTIONS.APARTMENTS, id, updated);

            eventBus.emit(EVENTS.APARTMENT_UPDATED, updated);
            toastSuccess('Daire bilgileri güncellendi');

            return true;
        }

        return false;
    },

    /**
     * Initialize missing apartments (for first-time setup)
     */
    async initializeMissing(): Promise<void> {
        const existingNumbers = new Set(AppState.apartments.map(a => a.apartmentNo));

        for (let apt = 1; apt <= TOTAL_APARTMENTS; apt++) {
            if (!existingNumbers.has(apt)) {
                const newApartment: Apartment = {
                    id: `apt-${apt}`,
                    apartmentNo: apt,
                    residentName: `Daire ${apt}`,
                    contactNumber: '',
                    residentCount: 0,
                    isOwner: true,
                    moveInDate: new Date().toISOString().split('T')[0],
                    balance: 0
                };

                AppState.apartments.push(newApartment);
                await FirebaseService.add(COLLECTIONS.APARTMENTS, newApartment);
            }
        }
    },

    /**
     * Get apartments with unpaid dues for current month
     */
    getWithUnpaidDues(year: number, month: number): Apartment[] {
        return AppState.apartments.filter(apt => {
            return !AppState.dues[year]?.[apt.apartmentNo]?.[month];
        });
    },

    /**
     * Get apartments with phone numbers (for notifications)
     */
    getWithPhone(): Apartment[] {
        return AppState.apartments.filter(apt =>
            apt.contactNumber && apt.contactNumber.trim() !== ''
        );
    },

    /**
     * Get occupancy statistics
     */
    getOccupancyStats(): { occupied: number; empty: number; total: number } {
        const occupied = AppState.apartments.filter(apt =>
            apt.residentName && !apt.residentName.startsWith('Daire ')
        ).length;

        return {
            occupied,
            empty: TOTAL_APARTMENTS - occupied,
            total: TOTAL_APARTMENTS
        };
    }
};

export default ApartmentsService;
