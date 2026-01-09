import { EdgeCommandsService } from './edge-commands.service';
export declare class EdgeCommandsController {
    private readonly commandsService;
    constructor(commandsService: EdgeCommandsService);
    getPendingCommands(circleId: string, edgeInstanceId: string, limitStr?: string): Promise<{
        error: string;
        commands: never[];
    } | {
        commands: import("./edge-commands.service").EdgeCommandDto[];
        error?: undefined;
    }>;
    acknowledgeCommand(circleId: string, commandId: string, body: {
        edgeInstanceId: string;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
    completeCommand(circleId: string, commandId: string, body: {
        edgeInstanceId: string;
        success: boolean;
        message?: string;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
}
