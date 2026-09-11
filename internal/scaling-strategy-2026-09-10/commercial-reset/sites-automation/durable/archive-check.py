"""Bounded static Sites archive validation. No extraction or network access."""
import base64
import gzip
import hashlib
import io
import json
import sys
import tarfile

def check(archive, html, manifest, allow_source_metadata=False):
    if len(archive) > 128000:
        raise ValueError('archive_too_large')
    with gzip.GzipFile(fileobj=io.BytesIO(archive)) as compressed:
        raw = compressed.read(128001)
    if len(raw) > 128000:
        raise ValueError('expanded_archive_too_large')
    expected = {'dist', 'dist/index.html', 'dist/.openai', 'dist/.openai/hosting.json'}
    with tarfile.open(fileobj=io.BytesIO(raw), mode='r:') as bundle:
        members = bundle.getmembers()
        names = [member.name.rstrip('/') for member in members]
        if len(names) != 4 or set(names) != expected:
            raise ValueError('archive_members_invalid')
        for member in members:
            name = member.name.rstrip('/')
            directory = name in {'dist', 'dist/.openai'}
            if not (member.isdir() if directory else member.isfile()):
                raise ValueError('archive_type_invalid')
            # Escaping a valid 12 KiB JSON brief can expand its rendered HTML.
            if member.size < 0 or member.size > 32768 or (directory and member.size != 0):
                raise ValueError('archive_member_size_invalid')
            if member.mode & 0o7000 or member.sparse is not None:
                raise ValueError('archive_metadata_invalid')
            if any(key not in {'mtime', 'atime', 'ctime'} and not
                   (allow_source_metadata and key.startswith(('LIBARCHIVE.xattr.', 'SCHILY.xattr.')))
                   for key in member.pax_headers):
                raise ValueError('archive_extended_metadata_invalid')
            body_end = member.offset_data + member.size
            padded_end = member.offset_data + ((member.size + 511) // 512) * 512
            if any(raw[body_end:padded_end]):
                raise ValueError('archive_padding_invalid')
        archive_end = max(member.offset_data + ((member.size + 511) // 512) * 512 for member in members)
        if len(raw) % 512 or len(raw) - archive_end < 1024 or any(raw[archive_end:]):
            raise ValueError('archive_trailing_payload')
        if bundle.extractfile('dist/index.html').read() != html:
            raise ValueError('archive_content_mismatch')
        actual_manifest = json.load(bundle.extractfile('dist/.openai/hosting.json'))
        if actual_manifest != manifest:
            raise ValueError('archive_manifest_mismatch')
    return {'hash': hashlib.sha256(archive).hexdigest(), 'bytes': len(archive),
            'htmlHash': hashlib.sha256(html).hexdigest()}

def normalize(archive, html, manifest):
    # Check names, types, sizes and exact contents before discarding metadata.
    # No member is ever extracted; the canonical archive contains known bytes.
    check(archive, html, manifest, allow_source_metadata=True)
    raw = io.BytesIO()
    with tarfile.open(fileobj=raw, mode='w', format=tarfile.USTAR_FORMAT) as bundle:
        for name, body in [('dist', None), ('dist/index.html', html), ('dist/.openai', None),
                           ('dist/.openai/hosting.json', (json.dumps(manifest, separators=(',', ':')) + '\n').encode())]:
            member = tarfile.TarInfo(name)
            member.type = tarfile.DIRTYPE if body is None else tarfile.REGTYPE
            member.mode = 0o755 if body is None else 0o644
            member.size = len(body) if body is not None else 0
            member.uid = member.gid = member.mtime = 0
            member.uname = member.gname = ''
            bundle.addfile(member, io.BytesIO(body) if body is not None else None)
    output = io.BytesIO()
    with gzip.GzipFile(fileobj=output, mode='wb', filename='', mtime=0) as compressed:
        compressed.write(raw.getvalue())
    result = output.getvalue()
    check(result, html, manifest)
    return result

if __name__ == '__main__':
    try:
        encoded = sys.stdin.buffer.read(200001)
        if len(encoded) > 200000:
            raise ValueError('input_too_large')
        request = json.loads(encoded)
        archive = base64.b64decode(request['archive'], validate=True)
        html = request['html'].encode('utf-8')
        if request.get('normalize') is True:
            archive = normalize(archive, html, request['manifest'])
        result = check(archive, html, request['manifest'])
        if request.get('normalize') is True:
            result['archive'] = base64.b64encode(archive).decode('ascii')
        print(json.dumps(result))
    except Exception:
        print(json.dumps({'error': 'archive_verification_failed'}))
        sys.exit(1)
