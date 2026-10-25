import { describe, it, expect, vi, beforeEach } from 'vitest';

// Stub windowGlobalData and getFromStorage so the module loads under Node
vi.mock('../src/windowGlobalData', () => ({ windowGlobalData: {} }));
vi.mock('../src/utils/getFromStorage', () => ({ default: vi.fn(() => null) }));

import Core from '../src/gptk-core';
import type { MediaItem, Action } from '../src/types';

function makeItem(mediaKey: string): MediaItem {
  return { mediaKey, dedupKey: `dedup-${mediaKey}`, timestamp: 0, creationTimestamp: 0 };
}

describe('Core.executeAction', () => {
  let core: Core;
  let fakeExportMetadata: ReturnType<typeof vi.fn>;
  let fakeRestoreFromTrash: ReturnType<typeof vi.fn>;
  let fakeRemoveFromLockedFolder: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    core = new Core();
    fakeExportMetadata = vi.fn().mockResolvedValue(undefined);
    fakeRestoreFromTrash = vi.fn().mockResolvedValue(undefined);
    fakeRemoveFromLockedFolder = vi.fn().mockResolvedValue(undefined);

    core.apiUtils = {
      exportMetadata: fakeExportMetadata,
      restoreFromTrash: fakeRestoreFromTrash,
      removeFromLockedFolder: fakeRemoveFromLockedFolder,
    } as unknown as Core['apiUtils'];
  });

  it('calls exportMetadata and does NOT restore when source is trash and action is exportMetadata', async () => {
    const items = [makeItem('item-trash')];
    const action: Action = { elementId: 'exportMetadata' };

    await core.executeAction(action, {
      mediaItems: items,
      source: 'trash',
      preserveOrder: false,
    });

    expect(fakeExportMetadata).toHaveBeenCalledTimes(1);
    expect(fakeExportMetadata).toHaveBeenCalledWith(items);
    expect(fakeRestoreFromTrash).not.toHaveBeenCalled();
    expect(fakeRemoveFromLockedFolder).not.toHaveBeenCalled();
  });

  it('calls exportMetadata and does NOT unlock when source is lockedFolder and action is exportMetadata', async () => {
    const items = [makeItem('item-locked')];
    const action: Action = { elementId: 'exportMetadata' };

    await core.executeAction(action, {
      mediaItems: items,
      source: 'lockedFolder',
      preserveOrder: false,
    });

    expect(fakeExportMetadata).toHaveBeenCalledTimes(1);
    expect(fakeExportMetadata).toHaveBeenCalledWith(items);
    expect(fakeRemoveFromLockedFolder).not.toHaveBeenCalled();
    expect(fakeRestoreFromTrash).not.toHaveBeenCalled();
  });

  it('explicit restoreTrash action from trash source dispatches to restoreFromTrash', async () => {
    const items = [makeItem('item-trash')];
    const action: Action = { elementId: 'restoreTrash' };

    await core.executeAction(action, {
      mediaItems: items,
      source: 'trash',
      preserveOrder: false,
    });

    expect(fakeRestoreFromTrash).toHaveBeenCalledTimes(1);
    expect(fakeRestoreFromTrash).toHaveBeenCalledWith(items);
    expect(fakeExportMetadata).not.toHaveBeenCalled();
    expect(fakeRemoveFromLockedFolder).not.toHaveBeenCalled();
  });

  it('explicit unLock action from lockedFolder source dispatches to removeFromLockedFolder', async () => {
    const items = [makeItem('item-locked')];
    const action: Action = { elementId: 'unLock' };

    await core.executeAction(action, {
      mediaItems: items,
      source: 'lockedFolder',
      preserveOrder: false,
    });

    expect(fakeRemoveFromLockedFolder).toHaveBeenCalledTimes(1);
    expect(fakeRemoveFromLockedFolder).toHaveBeenCalledWith(items);
    expect(fakeExportMetadata).not.toHaveBeenCalled();
    expect(fakeRestoreFromTrash).not.toHaveBeenCalled();
  });

  it('rejects restoreTrash action when source is not trash', async () => {
    const items = [makeItem('item-lib')];
    const action: Action = { elementId: 'restoreTrash' };

    await expect(
      core.executeAction(action, {
        mediaItems: items,
        source: 'library',
        preserveOrder: false,
      })
    ).rejects.toThrow('Restore from trash requires the Trash source');

    expect(fakeRestoreFromTrash).not.toHaveBeenCalled();
  });

  it('rejects unLock action when source is not lockedFolder', async () => {
    const items = [makeItem('item-lib')];
    const action: Action = { elementId: 'unLock' };

    await expect(
      core.executeAction(action, {
        mediaItems: items,
        source: 'library',
        preserveOrder: false,
      })
    ).rejects.toThrow('Unlock requires the Locked Folder source');

    expect(fakeRemoveFromLockedFolder).not.toHaveBeenCalled();
  });
});
