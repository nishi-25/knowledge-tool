# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['backend_entry.py'],
    pathex=['../backend'],
    binaries=[],
    datas=[],
    hiddenimports=['uvicorn.logging', 'uvicorn.loops', 'uvicorn.loops.auto', 'uvicorn.protocols', 'uvicorn.protocols.http', 'uvicorn.protocols.http.auto', 'uvicorn.protocols.websockets', 'uvicorn.protocols.websockets.auto', 'uvicorn.lifespan', 'uvicorn.lifespan.on'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='knowledge-view-backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

# onedir（フォルダ形式）でビルドする。onefile（単一exe）は実行のたびに
# 一時フォルダへ自己展開する必要があり、Windows環境（特にユーザー名に
# 日本語などの非ASCII文字を含む場合）で "Failed to start embedded python
# interpreter!" という起動失敗を引き起こすことがあるため避けている。
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='knowledge-view-backend',
)
