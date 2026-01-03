import { Repository } from 'typeorm';
import { NgCircle } from './ng-circle.entity';
import { NgCircleMember } from './ng-circle-member.entity';
import { NgUser } from '../auth/ng-user.entity';
export declare class CirclesService {
    private readonly circlesRepo;
    private readonly membersRepo;
    private readonly usersRepo;
    constructor(circlesRepo: Repository<NgCircle>, membersRepo: Repository<NgCircleMember>, usersRepo: Repository<NgUser>);
    createCircle(ownerUserId: string, name: string): Promise<{
        circleId: `${string}-${string}-${string}-${string}-${string}`;
        name: string;
        createdAt: string;
    }>;
    listMyCircles(userId: string): Promise<{
        circles: Array<{
            id: string;
            name: string;
        }>;
        count: number;
    }>;
    listMembers(requesterUserId: string, circleId: string): Promise<{
        members: {
            userId: string;
            email: string | null;
            displayName: string | null;
            role: string;
            joinedAt: string;
        }[];
        count: number;
    }>;
    addMember(requesterUserId: string, circleId: string, dto: {
        email: string;
        role: string;
        clientRequestId?: string;
    }): Promise<{
        created: boolean;
        member: {
            userId: string;
            role: string;
        };
    }>;
    mustBeMember(userId: string, circleId: string): Promise<NgCircleMember>;
    mustHaveRole(userId: string, circleId: string, allowed: string[]): Promise<NgCircleMember>;
    getCircleOwner(circleId: string): Promise<string | null>;
}
