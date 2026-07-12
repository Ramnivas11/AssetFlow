import { AssetStatus } from "@prisma/client";

import { HTTP_STATUS } from "../../constants/httpStatus";
import { AppError } from "../../utils/AppError";

const validTransitions: Record<AssetStatus, AssetStatus[]> = {
    [AssetStatus.AVAILABLE]: [
        AssetStatus.ALLOCATED,
        AssetStatus.RESERVED,
        AssetStatus.UNDER_MAINTENANCE,
        AssetStatus.LOST,
        AssetStatus.RETIRED,
        AssetStatus.DISPOSED,
    ],
    [AssetStatus.ALLOCATED]: [AssetStatus.AVAILABLE, AssetStatus.LOST, AssetStatus.RETIRED],
    [AssetStatus.RESERVED]: [AssetStatus.AVAILABLE, AssetStatus.ALLOCATED, AssetStatus.LOST],
    [AssetStatus.UNDER_MAINTENANCE]: [AssetStatus.AVAILABLE, AssetStatus.RETIRED],
    [AssetStatus.LOST]: [AssetStatus.AVAILABLE, AssetStatus.RETIRED],
    [AssetStatus.RETIRED]: [AssetStatus.DISPOSED],
    [AssetStatus.DISPOSED]: [],
};

export const assertAssetTransition = (from: AssetStatus, to: AssetStatus) => {
    if (from === to) return;
    if (!validTransitions[from].includes(to)) {
        throw new AppError(`Invalid asset lifecycle transition from ${from} to ${to}`, HTTP_STATUS.BAD_REQUEST);
    }
};

export const assertAssetCanBeAllocated = (status: AssetStatus) => {
    const allocatableStatuses: AssetStatus[] = [AssetStatus.AVAILABLE, AssetStatus.RESERVED];
    if (!allocatableStatuses.includes(status)) {
        throw new AppError(`Asset with status ${status} cannot be allocated`, HTTP_STATUS.BAD_REQUEST);
    }
};

export const assertAssetCanBeMutated = (status: AssetStatus) => {
    if (status === AssetStatus.DISPOSED) {
        throw new AppError("Disposed assets are read-only", HTTP_STATUS.BAD_REQUEST);
    }
};
