export interface PerennialAsset {
    id: string;
    qrCode: string;
    assetName: string;
    assetTypeId?: string;
    locationLat?: number;
    locationLong?: number;
    status: 'PENDING' | 'PLANTED' | 'GROWING' | 'HARVESTED' | 'DEAD';
    plantedAt?: string;
    caretakerId?: string;
    updatedAt: string;
    farmLocationId?: string;
    currentOwnerId?: string;
    assetType?: any;
    careProcess?: any;
    caretaker?: any;
    currentOwner?: any;
    farmLocation?: any;
    latestImage?: string;
    logs?: AssetCareLog[];
}

export interface AssetCareLog {
    id: string;
    assetId: string;
    taskId?: string;
    logType: 'ROUTINE' | 'INCIDENT' | 'UPDATE';
    description: string;
    images?: string[];
    performedBy: string;
    performedAt: string;
    locationLat?: number;
    locationLong?: number;
    performer?: any;
}
