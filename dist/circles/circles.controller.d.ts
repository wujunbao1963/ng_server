import { CreateCircleDto } from './dto/create-circle.dto';
import { AddCircleMemberDto } from './dto/add-circle-member.dto';
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
        }[];
        count: number;
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
