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
        circleId: `${string}-${string}-${string}-${string}-${string}`;
        name: string;
        createdAt: string;
    }>;
    listMyCircles(req: {
        user: JwtUser;
    }): Promise<{
        circles: {
            id: string;
            name: string;
            role: string;
        }[];
        count: number;
    }>;
    getCircle(req: {
        user: JwtUser;
    }, circleId: string): Promise<{
        circle: {
            id: string;
            name: string;
            createdAt: string;
        };
        myRole: string;
        owner: {
            userId: string;
            email: string;
            displayName: string | null;
        } | null;
        members: {
            userId: string;
            email: string | null;
            displayName: string | null;
            role: string;
            joinedAt: string;
        }[];
        memberCount: number;
    }>;
    updateCircle(req: {
        user: JwtUser;
    }, circleId: string, dto: UpdateCircleDto): Promise<{
        circle: {
            id: string;
            name: string;
            createdAt: string;
        };
    }>;
    deleteCircle(req: {
        user: JwtUser;
    }, circleId: string): Promise<{
        deleted: boolean;
        circleId: string;
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
    listMembers(req: {
        user: JwtUser;
    }, circleId: string): Promise<{
        members: {
            userId: string;
            email: string | null;
            displayName: string | null;
            role: string;
            joinedAt: string;
        }[];
        count: number;
    }>;
    addMember(req: {
        user: JwtUser;
    }, circleId: string, dto: AddCircleMemberDto): Promise<{
        created: boolean;
        member: {
            userId: string;
            role: string;
        };
    }>;
}
