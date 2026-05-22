#!/usr/bin/env python3
"""Export AI-generated novel chapters to Fanqie-friendly TXT + ZIP bundles."""

from __future__ import annotations

import argparse
import re
import sys
import zipfile
from pathlib import Path


CHAPTER_FILE_RE = re.compile(r"^第(\d+)章.*\.md$")
TITLE_LINE_RE = re.compile(r"^#\s*第(\d+)章[:：]\s*(.+?)\s*$")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Export markdown novel chapters into Fanqie batch-import TXT files."
    )
    parser.add_argument(
        "novel_dir",
        help="Path to the novel directory, e.g. novels/最后一个证人",
    )
    parser.add_argument(
        "--output-dir",
        help="Where to write exported files. Defaults to <novel_dir>/fanqie-export",
    )
    parser.add_argument(
        "--zip-name",
        help="ZIP filename. Defaults to <novel_name>-fanqie-upload.zip",
    )
    return parser.parse_args()


def list_chapter_files(novel_dir: Path) -> list[Path]:
    chapter_files = []
    for path in novel_dir.iterdir():
        if not path.is_file():
            continue
        if CHAPTER_FILE_RE.match(path.name):
            chapter_files.append(path)
    return sorted(chapter_files, key=chapter_number_from_name)


def chapter_number_from_name(path: Path) -> int:
    match = CHAPTER_FILE_RE.match(path.name)
    if not match:
        raise ValueError(f"Not a chapter file: {path}")
    return int(match.group(1))


def extract_title(markdown: str, fallback_number: int) -> tuple[int, str]:
    for line in markdown.splitlines():
        match = TITLE_LINE_RE.match(line.strip())
        if match:
            return int(match.group(1)), match.group(2).strip()
    return fallback_number, f"第{fallback_number}章"


def extract_body(markdown: str) -> str:
    marker = "## 正文"
    start = markdown.find(marker)
    if start == -1:
        raise ValueError("Cannot find '## 正文' section")
    start += len(marker)
    tail = markdown[start:].lstrip()

    end_markers = ("\n---", "\n## 章节备注")
    end_positions = [tail.find(marker_text) for marker_text in end_markers if tail.find(marker_text) != -1]
    if end_positions:
        tail = tail[: min(end_positions)]

    lines = [line.rstrip() for line in tail.splitlines()]
    cleaned: list[str] = []
    last_blank = False
    for line in lines:
        stripped = line.strip()
        if not stripped:
            if not last_blank:
                cleaned.append("")
            last_blank = True
            continue
        cleaned.append(stripped)
        last_blank = False

    while cleaned and cleaned[0] == "":
        cleaned.pop(0)
    while cleaned and cleaned[-1] == "":
        cleaned.pop()

    body = "\n".join(cleaned)
    if not body:
        raise ValueError("Chapter body is empty after extraction")
    return body + "\n"


def write_txt(output_dir: Path, chapter_number: int, title: str, body: str) -> Path:
    safe_title = sanitize_filename(title)
    filename = f"第{chapter_number:02d}章 {safe_title}.txt"
    target = output_dir / filename
    target.write_text(body, encoding="utf-8")
    return target


def sanitize_filename(name: str) -> str:
    return re.sub(r'[\\/:*?"<>|]+', "_", name).strip()


def build_zip(zip_path: Path, txt_files: list[Path]) -> None:
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for txt_file in txt_files:
            archive.write(txt_file, arcname=txt_file.name)


def write_manifest(output_dir: Path, novel_name: str, txt_files: list[Path]) -> Path:
    lines = [
        f"# {novel_name} Fanqie Upload Manifest",
        "",
        "上传步骤：",
        "1. 打开番茄作家助手并进入作品章节页。",
        "2. 新建章节后，打开“番茄小说注入神器”侧边栏。",
        "3. 上传同目录中的 ZIP 压缩包，或直接逐个选择 TXT。",
        "4. 插件识别章节标题后，点击“注入此章节”。",
        "5. 检查标题和正文，再点保存发布。",
        "",
        "TXT 文件：",
    ]
    lines.extend(f"- {txt_file.name}" for txt_file in txt_files)
    manifest = output_dir / "README-番茄导入说明.md"
    manifest.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return manifest


def main() -> int:
    args = parse_args()
    novel_dir = Path(args.novel_dir).expanduser().resolve()
    if not novel_dir.is_dir():
        print(f"Novel directory not found: {novel_dir}", file=sys.stderr)
        return 1

    chapter_files = list_chapter_files(novel_dir)
    if not chapter_files:
        print(f"No chapter markdown files found in: {novel_dir}", file=sys.stderr)
        return 1

    output_dir = (
        Path(args.output_dir).expanduser().resolve()
        if args.output_dir
        else novel_dir / "fanqie-export"
    )
    output_dir.mkdir(parents=True, exist_ok=True)

    txt_files: list[Path] = []
    for chapter_file in chapter_files:
        markdown = chapter_file.read_text(encoding="utf-8")
        fallback_number = chapter_number_from_name(chapter_file)
        chapter_number, title = extract_title(markdown, fallback_number)
        body = extract_body(markdown)
        txt_files.append(write_txt(output_dir, chapter_number, title, body))

    zip_name = args.zip_name or f"{novel_dir.name}-fanqie-upload.zip"
    zip_path = output_dir / zip_name
    build_zip(zip_path, txt_files)
    manifest = write_manifest(output_dir, novel_dir.name, txt_files)

    print(f"Exported {len(txt_files)} chapter(s) to: {output_dir}")
    print(f"ZIP package: {zip_path.name}")
    print(f"Manifest: {manifest.name}")
    for txt_file in txt_files:
        print(f"- {txt_file.name}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
