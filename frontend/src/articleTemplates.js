function heading(text) {
  return `<h2>${text}</h2><p><br></p>`;
}

export const ARTICLE_TEMPLATES = [
  {
    key: 'blank',
    icon: 'bi bi-file-earmark',
    label: '白紙から作成',
    description: 'テンプレートを使わず、空のページから書き始めます',
    titlePrefix: '',
    bodyHtml: '',
  },
  {
    key: 'daily-report',
    icon: 'bi bi-calendar-day',
    label: '日報',
    description: '本日の業務内容や進捗をまとめる日次レポート',
    titlePrefix: '日報 ',
    bodyHtml: (
      heading('本日の業務内容') +
      heading('進捗・成果') +
      heading('課題・問題点') +
      heading('明日の予定')
    ),
  },
  {
    key: 'weekly-report',
    icon: 'bi bi-calendar-week',
    label: '週報',
    description: '今週の実績と来週の予定をまとめる週次レポート',
    titlePrefix: '週報 ',
    bodyHtml: (
      heading('今週のサマリー') +
      heading('今週の実績') +
      heading('来週の予定') +
      heading('課題・相談事項')
    ),
  },
  {
    key: 'general-report',
    icon: 'bi bi-file-earmark-text',
    label: '報告書',
    description: '背景や結論を整理して伝える一般的な報告書',
    titlePrefix: '',
    bodyHtml: (
      heading('概要') +
      heading('背景・目的') +
      heading('詳細') +
      heading('結論・まとめ')
    ),
  },
  {
    key: 'plan',
    icon: 'bi bi-kanban',
    label: '計画表',
    description: '目的・スケジュール・担当をまとめる計画表',
    titlePrefix: '計画表 ',
    bodyHtml: (
      heading('目的・背景') +
      heading('スケジュール') +
      heading('担当者・体制') +
      heading('タスク一覧') +
      heading('リスク・懸念事項')
    ),
  },
  {
    key: 'meeting-minutes',
    icon: 'bi bi-people',
    label: '議事録',
    description: '日時・参加者・決定事項をまとめる会議の記録',
    titlePrefix: '議事録 ',
    bodyHtml: (
      heading('日時・参加者') +
      heading('議題') +
      heading('決定事項') +
      heading('ToDo（担当・期限）')
    ),
  },
  {
    key: 'manual',
    icon: 'bi bi-list-check',
    label: '手順書・マニュアル',
    description: '作業手順や注意点をまとめる操作手順書',
    titlePrefix: '',
    bodyHtml: (
      heading('概要') +
      heading('事前準備') +
      heading('手順') +
      heading('注意点') +
      heading('トラブルシューティング')
    ),
  },
  {
    key: 'retrospective',
    icon: 'bi bi-arrow-repeat',
    label: 'ふりかえり（KPT）',
    description: 'Keep・Problem・Tryでまとめる活動のふりかえり',
    titlePrefix: 'ふりかえり ',
    bodyHtml: (
      heading('Keep（継続すること）') +
      heading('Problem（問題点）') +
      heading('Try（次に試すこと）')
    ),
  },
];
