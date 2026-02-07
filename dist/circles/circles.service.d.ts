import { Repository } from 'typeorm';
import { NgCircle } from './ng-circle.entity';
import { NgUser } from '../auth/ng-user.entity';
import { NgRole } from '../roles/ng-role.entity';
export interface CreateCircleDto {
    name: string;
    propertyType?: string;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    proximityRadiusM?: number;
}
export interface UpdateCircleDto {
    name?: string;
    propertyType?: string;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    proximityRadiusM?: number;
}
export interface AddMemberDto {
    email: string;
    role: 'caretaker' | 'acting_owner' | 'witness';
    validUntil?: string;
}
export declare class CirclesService {
    private readonly circlesRepo;
    private readonly rolesRepo;
    private readonly usersRepo;
    constructor(circlesRepo: Repository<NgCircle>, rolesRepo: Repository<NgRole>, usersRepo: Repository<NgUser>);
    createCircle(ownerUserId: string, dto: CreateCircleDto): Promise<{
        circle: {
            id: string;
            name: string;
            propertyType: string | null;
            address: string | null;
            city: string | null;
            state: string | null;
            postalCode: string | null;
            country: string | null;
            latitude: number | null;
            longitude: number | null;
            proximityRadiusM: number;
            createdAt: string;
            updatedAt: string;
        };
        role: {
            id: string;
            userId: string;
            email: string | null;
            displayName: string | null;
            role: string;
            validFrom: string;
            validUntil: string | null;
            suspended: boolean;
            createdAt: string;
        };
    }>;
    listMyCircles(userId: string): Promise<{
        circles: {
            id: string;
            name: string;
            role: string;
            validFrom: string;
            validUntil: string | null;
            suspended: boolean;
            createdAt: string | null;
        }[];
        count: number;
    }>;
    getCircleDetail(requesterUserId: string, circleId: string): Promise<{
        circle: {
            id: string;
            name: string;
            propertyType: string | null;
            address: string | null;
            city: string | null;
            state: string | null;
            postalCode: string | null;
            country: string | null;
            latitude: number | null;
            longitude: number | null;
            proximityRadiusM: number;
            createdAt: string;
            updatedAt: string;
        };
        myRole: string;
        owner: {
            userId: string;
            email: string | null;
            displayName: string | null;
        } | null;
        members: {
            id: string;
            userId: string;
            email: string | null;
            displayName: string | null;
            role: string;
            validFrom: string;
            validUntil: string | null;
            suspended: boolean;
            createdAt: string;
        }[];
        memberCount: number;
    }>;
    updateCircle(requesterUserId: string, circleId: string, dto: UpdateCircleDto): Promise<{
        circle: {
            id: string;
            name: string;
            propertyType: string | null;
            address: string | null;
            city: string | null;
            state: string | null;
            postalCode: string | null;
            country: string | null;
            latitude: number | null;
            longitude: number | null;
            proximityRadiusM: number;
            createdAt: string;
            updatedAt: string;
        };
    }>;
    deleteCircle(requesterUserId: string, circleId: string): Promise<{
        deleted: boolean;
        circleId: string;
    }>;
    listMembers(requesterUserId: string, circleId: string): Promise<{
        members: {
            id: string;
            userId: string;
            email: string | null;
            displayName: string | null;
            role: string;
            validFrom: string;
            validUntil: string | null;
            suspended: boolean;
            createdAt: string;
        }[];
        count: number;
    }>;
    addMember(requesterUserId: string, circleId: string, dto: AddMemberDto): Promise<{
        created: boolean;
        role: {
            id: string;
            userId: string;
            email: string | null;
            displayName: string | null;
            role: string;
            validFrom: string;
            validUntil: string | null;
            suspended: boolean;
            createdAt: string;
        };
        message: string;
    } | {
        created: boolean;
        role: {
            id: string;
            userId: string;
            email: string | null;
            displayName: string | null;
            role: string;
            validFrom: string;
            validUntil: string | null;
            suspended: boolean;
            createdAt: string;
        };
        message?: undefined;
    }>;
    removeMember(requesterUserId: string, circleId: string, targetUserId: string): Promise<{
        removed: boolean;
        userId: string;
    }>;
    leaveCircle(requesterUserId: string, circleId: string): Promise<{
        left: boolean;
        circleId: string;
    }>;
    transferOwnership(requesterUserId: string, circleId: string, newOwnerUserId: string): Promise<{
        transferred: boolean;
        circleId: string;
        previousOwner: string;
        newOwner: string;
    }>;
    getCircleOwner(circleId: string): Promise<string | null>;
    getWitnessUserIds(circleId: string): Promise<string[]>;
    mustBeMember(userId: string, circleId: string): Promise<NgRole>;
    mustHaveRole(userId: string, circleId: string, allowed: string[]): Promise<NgRole>;
    private formatCircle;
    private formatRole;
}
