import importlib.util
import http.client
import json
import pathlib
import threading
import tempfile
import unittest
from unittest.mock import patch
from http.server import ThreadingHTTPServer

spec = importlib.util.spec_from_file_location('helper', pathlib.Path(__file__).with_name('helper.py'))
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)

VALID_HANDOFF = {
    'sourceUrl': 'https://www.youtube.com/watch?v=WlpK6_BDNgE',
    'jobId': 'video_1234567890abcdef12345678',
    'clientId': 'globalplay-streaming',
    'uploadTicket': 'a' * 64,
    'callbackBase': 'https://servidor-nexus.diamantehinode2015.workers.dev'
}

class FakeDownloader:
    def __init__(self):
        self.lock = threading.Lock()
        self.state = {'status': 'idle'}
        self.files = {}
        self.started = []
    def start(self, url, handoff=None):
        self.started.append((helper.youtube_url(url), handoff))

class HelperTests(unittest.TestCase):
    def test_only_normalized_youtube_video(self):
        self.assertEqual(helper.youtube_url('https://youtu.be/WlpK6_BDNgE?list=abc'), 'https://www.youtube.com/watch?v=WlpK6_BDNgE')
        for value in ['http://youtube.com/watch?v=WlpK6_BDNgE', 'https://youtube.com.evil.test/watch?v=WlpK6_BDNgE', 'https://youtube.com/playlist?list=x', 'file:///a', 'https://user@youtube.com/watch?v=WlpK6_BDNgE']:
            with self.subTest(value=value), self.assertRaises(ValueError): helper.youtube_url(value)

    def test_local_handoff_is_bound_to_production_nexus_and_one_job(self):
        normalized = helper.normalize_local_upload(dict(VALID_HANDOFF))
        self.assertEqual(normalized['jobId'], VALID_HANDOFF['jobId'])
        self.assertEqual(normalized['sourceUrl'], VALID_HANDOFF['sourceUrl'])
        for changed in [
            {'callbackBase': 'https://evil.test'},
            {'callbackBase': 'http://servidor-nexus.diamantehinode2015.workers.dev'},
            {'callbackBase': 'https://servidor-nexus.diamantehinode2015.workers.dev.evil.test'},
            {'jobId': '../../other-job'},
            {'clientId': '../other-client'},
            {'uploadTicket': 'short'},
        ]:
            candidate = dict(VALID_HANDOFF)
            candidate.update(changed)
            with self.subTest(changed=changed), self.assertRaises(ValueError):
                helper.normalize_local_upload(candidate)

    def test_upload_stream_reports_real_bytes_and_waits_for_r2_confirmation(self):
        class FakeResponse:
            status = 201
            def read(self, limit=0):
                return b'{"ok":true,"renderStarted":true}'
        class FakeConnection:
            def __init__(self, host, timeout):
                self.timeout = timeout
                self.sent = 0
            def putrequest(self, *args): pass
            def putheader(self, *args): pass
            def endheaders(self): pass
            def send(self, chunk): self.sent += len(chunk)
            def getresponse(self): return FakeResponse()
            def close(self): pass
        with tempfile.TemporaryDirectory() as d:
            file = pathlib.Path(d) / 'video.mp4'
            file.write_bytes(b'0' * (6 * 1024 * 1024))
            posted = []
            progress = []
            with patch.object(helper.http.client, 'HTTPSConnection', FakeConnection):
                with patch.object(helper, 'report_to_nexus', side_effect=lambda *a, **kw: posted.append((a, kw))):
                    result = helper.upload_to_nexus(file, VALID_HANDOFF,
                        on_progress=lambda sent, total: progress.append((sent, total)))
            self.assertTrue(result['renderStarted'])
            self.assertEqual(progress[-1], (file.stat().st_size, file.stat().st_size))
            self.assertEqual(posted[-1][1]['uploaded_bytes'], file.stat().st_size)
            self.assertEqual(posted[-1][1]['total_bytes'], file.stat().st_size)
            self.assertGreaterEqual(len(posted), 2)

    def test_pt_audio_required_and_h264_preferred(self):
        formats = [{'format_id': 'video', 'height': 720, 'vcodec': 'avc1', 'acodec': 'none'}, {'format_id': 'av1', 'height': 720, 'vcodec': 'av01', 'acodec': 'none'}, {'format_id': 'english', 'language': 'en', 'vcodec': 'none', 'acodec': 'mp4a'}, {'format_id': 'portuguese', 'language': 'pt-BR', 'vcodec': 'none', 'acodec': 'mp4a'}]
        self.assertEqual(helper.select_format({'formats': formats}), 'video+portuguese')
        with self.assertRaisesRegex(ValueError, 'audio_pt_unconfirmed'): helper.select_format({'formats': formats[:-1]})

    def test_direct_https_formats_preferred_to_hls_bitrate(self):
        formats = [{'format_id': 'video-hls', 'height': 720, 'vcodec': 'avc1', 'acodec': 'none', 'protocol': 'm3u8_native', 'tbr': 9000}, {'format_id': 'video-https', 'height': 720, 'vcodec': 'avc1', 'acodec': 'none', 'protocol': 'https', 'tbr': 1000}, {'format_id': 'audio-hls', 'language': 'pt', 'vcodec': 'none', 'acodec': 'mp4a', 'protocol': 'm3u8_native', 'abr': 300}, {'format_id': 'audio-https', 'language': 'pt', 'vcodec': 'none', 'acodec': 'mp4a', 'protocol': 'https', 'abr': 128}]
        self.assertEqual(helper.select_format({'formats': formats}), 'video-https+audio-https')

    def test_disk_permission_failure_leaves_error_instead_of_busy(self):
        with tempfile.TemporaryDirectory() as tmp:
            downloader = helper.Downloader(tmp, pathlib.Path(tmp) / 'ffmpeg.exe', 'node')
            downloader.state = {'status': 'busy'}
            with patch.object(pathlib.Path, 'mkdir', side_effect=PermissionError('disk denied')):
                downloader.download('https://www.youtube.com/watch?v=WlpK6_BDNgE')
            self.assertEqual(downloader.state['status'], 'error')
            self.assertFalse(downloader.files)

    def test_explicit_post_session_origin_csrf_and_file_access(self):
        downloader = FakeDownloader()
        server = ThreadingHTTPServer(('127.0.0.1', 0), helper.make_handler(downloader))
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            connection = http.client.HTTPConnection('127.0.0.1', server.server_port)
            origin = 'http://127.0.0.1:' + str(server.server_port)
            connection.request('GET', '/?url=https%3A%2F%2Fyoutu.be%2FWlpK6_BDNgE')
            response = connection.getresponse()
            cookie = response.getheader('Set-Cookie').split(';')[0]
            page = response.read().decode()
            token = json.loads(page.split('const token=', 1)[1].split(';', 1)[0])
            self.assertEqual(downloader.started, [])
            body = json.dumps({'url': 'WlpK6_BDNgE'})
            headers = {'Cookie': cookie, 'Origin': origin, 'X-Nexus-CSRF': token, 'Content-Type': 'application/json'}
            for changed in [{'Origin': 'https://evil.test'}, {'X-Nexus-CSRF': 'wrong'}, {'Host': 'evil.test'}]:
                connection.request('POST', '/download', body, dict(headers, **changed))
                response = connection.getresponse()
                self.assertEqual(response.status, 403)
                self.assertIsNone(response.getheader('Access-Control-Allow-Origin'))
                response.read()
            connection.request('POST', '/download', body, headers)
            response = connection.getresponse()
            self.assertEqual(response.status, 202)
            response.read()
            self.assertEqual(downloader.started, [('https://www.youtube.com/watch?v=WlpK6_BDNgE', None)])
            connection.request('GET', '/files/../../private', headers={'Cookie': cookie})
            response = connection.getresponse()
            self.assertEqual(response.status, 404)
            response.read()
            connection.close()
        finally:
            server.shutdown()
            server.server_close()
            thread.join()

    def test_health_reports_real_handoff_readiness_without_private_state(self):
        downloader = FakeDownloader()
        server = ThreadingHTTPServer(('127.0.0.1', 0), helper.make_handler(downloader))
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            connection = http.client.HTTPConnection('127.0.0.1', server.server_port)
            origin = 'https://servidor-nexus.diamantehinode2015.workers.dev'
            connection.request('GET', '/health', headers={'Origin': origin})
            response = connection.getresponse()
            assert response.status == 200
            assert response.getheader('Access-Control-Allow-Origin') == origin
            data = json.loads(response.read())
            self.assertEqual(data['service'], 'nexus-local-helper')
            self.assertTrue(data['handoffSupported'])
            self.assertTrue(data['handoffReady'])
            self.assertEqual(data['status'], 'idle')
            with downloader.lock:
                downloader.state = {'status': 'busy'}
            connection.request('GET', '/health', headers={'Origin': origin})
            response = connection.getresponse()
            data = json.loads(response.read())
            self.assertFalse(data['handoffReady'])
            self.assertEqual(data['status'], 'busy')
            self.assertNotIn('uploadTicket', data)
            connection.close()
        finally:
            server.shutdown()
            server.server_close()
            thread.join()

    def test_handoff_page_autostart_contract_is_present(self):
        downloader = FakeDownloader()
        server = ThreadingHTTPServer(('127.0.0.1', 0), helper.make_handler(downloader))
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            connection = http.client.HTTPConnection('127.0.0.1', server.server_port)
            connection.request('GET', '/')
            response = connection.getresponse()
            page = response.read().decode()
            self.assertIn("if(autoMode)setTimeout(startDownload,0)", page)
            self.assertIn("handoff.uploadTicket", page)
            self.assertEqual(downloader.started, [])
            connection.close()
        finally:
            server.shutdown()
            server.server_close()
            thread.join()

if __name__ == '__main__': unittest.main()
