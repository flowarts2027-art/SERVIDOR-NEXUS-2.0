import sqlite3
import unittest
from pathlib import Path

SQL = (Path(__file__).resolve().parents[1] / "sql/stagger-panel-schedules.sql").read_text()


class PanelSlots(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.executescript("""
            PRAGMA recursive_triggers=ON;
            CREATE TABLE clients(id PRIMARY KEY,status,instagram);
            CREATE TABLE post_ledger(id PRIMARY KEY,client_id,status,approval_status,scheduled_for,payload_json);
        """)
        self.db.executemany("INSERT INTO clients VALUES(?,'online',?)",
                            [(c, c) for c in 'abcdefg'] + [('demo', '')])

    def post(self, key, client, at='2099-11-05T12:00:00.000Z', status='ready'):
        self.db.execute("INSERT INTO post_ledger VALUES(?,?,?,'approved',?,'{}')",
                        (key, client, status, at))

    def times(self):
        return self.db.execute("SELECT scheduled_for FROM post_ledger ORDER BY scheduled_for").fetchall()

    def test_existing_and_future(self):
        for c in 'abcdef':
            self.post(c, c)
        self.db.executescript(SQL)
        self.assertEqual([row[0][11:16] for row in self.times()],
                         ['12:00','12:20','12:40','13:00','13:20','13:40'])
        before = self.times()
        self.db.executescript(SQL)
        self.assertEqual(self.times(), before)
        self.post('new','g')
        self.assertEqual(self.times()[-1][0][11:16], '14:00')

    def test_rollover_and_reschedule(self):
        self.db.executescript(SQL)
        self.post('a','a','2099-11-06T00:55:00.000Z','published')
        self.post('b','b','2099-11-06T00:59:00.000Z')
        self.assertEqual(self.times()[-1][0], '2099-11-06T11:00:00.000Z')
        self.db.execute("UPDATE post_ledger SET scheduled_for='2099-11-06T12:20:00.000Z' WHERE id='b'")
        self.post('c','c','2099-11-06T12:05:00.000Z')
        self.assertEqual(self.times()[-1][0], '2099-11-06T12:40:00.000Z')

    def test_historical_and_demo(self):
        self.db.executescript(SQL)
        self.post('a','a','2000-01-01T12:00:00.000Z')
        self.post('b','b','2000-01-01T12:00:00.000Z')
        self.post('demo','demo')
        self.post('real','a')
        self.assertEqual(len(set(self.times())), 2)


if __name__ == '__main__':
    unittest.main()
