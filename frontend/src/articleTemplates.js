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
];
