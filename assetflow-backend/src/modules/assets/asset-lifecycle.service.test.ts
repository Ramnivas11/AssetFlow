import assert from "node:assert/strict";
import test from "node:test";
import { AssetStatus } from "@prisma/client";

import { assertAssetCanBeAllocated, assertAssetTransition } from "./asset-lifecycle.service";

test("asset lifecycle allows approved transitions", () => {
    assert.doesNotThrow(() => assertAssetTransition(AssetStatus.AVAILABLE, AssetStatus.ALLOCATED));
    assert.doesNotThrow(() => assertAssetTransition(AssetStatus.ALLOCATED, AssetStatus.AVAILABLE));
    assert.doesNotThrow(() => assertAssetTransition(AssetStatus.UNDER_MAINTENANCE, AssetStatus.AVAILABLE));
});

test("asset lifecycle rejects invalid transitions", () => {
    assert.throws(() => assertAssetTransition(AssetStatus.DISPOSED, AssetStatus.AVAILABLE), /Invalid asset lifecycle transition/);
    assert.throws(() => assertAssetTransition(AssetStatus.RETIRED, AssetStatus.ALLOCATED), /Invalid asset lifecycle transition/);
});

test("allocation is blocked for unavailable lifecycle states", () => {
    assert.doesNotThrow(() => assertAssetCanBeAllocated(AssetStatus.AVAILABLE));
    assert.throws(() => assertAssetCanBeAllocated(AssetStatus.UNDER_MAINTENANCE), /cannot be allocated/);
    assert.throws(() => assertAssetCanBeAllocated(AssetStatus.LOST), /cannot be allocated/);
});
