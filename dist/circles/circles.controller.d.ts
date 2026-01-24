import { CreateCircleDto } from './dto/create-circle.dto';
import { AddCircleMemberDto } from './dto/add-circle-member.dto';
import { UpdateCircleDto } from './dto/update-circle.dto';
import { CirclesService } from './circles.service';
import { JwtUser } from '../auth/auth.types';
export declare class CirclesController {
    private readonly circlesService;
    constructor(circlesService: CirclesService);
    createCircle(req: {
        user: JwtUser;
    }, dto: CreateCircleDto): Promise<{
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
    listMyCircles(req: {
        user: JwtUser;
    }): Promise<{
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
    getCircle(req: {
        user: JwtUser;
    }, circleId: string): Promise<{
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
    updateCircle(req: {
        user: JwtUser;
    }, circleId: string, dto: UpdateCircleDto): Promise<{
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
    patchCircle(req: {
        user: JwtUser;
    }, circleId: string, dto: UpdateCircleDto): Promise<{
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
    deleteCircle(req: {
        user: JwtUser;
    }, circleId: string): Promise<{
        deleted: boolean;
        circleId: string;
    }>;
    listMembers(req: {
        user: JwtUser;
    }, circleId: string): Promise<{
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
    addMember(req: {
        user: JwtUser;
    }, circleId: string, dto: AddCircleMemberDto): Promise<{
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
    removeMember(req: {
        user: JwtUser;
    }, circleId: string, userId: string): Promise<{
        removed: boolean;
        userId: string;
    }>;
    leaveCircle(req: {
        user: JwtUser;
    }, circleId: string): Promise<{
        left: boolean;
        circleId: string;
    }>;
    transferOwnership(req: {
        user: JwtUser;
    }, circleId: string, dto: {
        newOwnerUserId: string;
    }): Promise<{
        transferred: boolean;
        circleId: string;
        previousOwner: string;
        newOwner: string;
    }>;
}
