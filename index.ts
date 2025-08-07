import { DOMParser } from 'xmldom';
import * as fs from 'node:fs';

function loadXml(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error('ファイル読み込みエラー:', error);
    throw error;
  }
}

function xmlToMarkdown(xmlText: string): string {
  const parser: DOMParser = new DOMParser();
  const doc: Document = parser.parseFromString(xmlText, 'text/xml');
  let markdown: string = '';

  const parserError = doc.getElementsByTagName('parsererror')[0];
  if (parserError) {
    throw new Error('XML解析エラー: ' + parserError.textContent);
  }

  // 法律名を追加
  const lawTitleElements = doc.getElementsByTagName('LawTitle');
  const lawTitle: string | null = lawTitleElements.length > 0 ? lawTitleElements[0].textContent?.trim() || null : null;
  if (lawTitle) {
    markdown += `# ${lawTitle}\n\n`;
  }

  // 編を処理
  const parts = doc.getElementsByTagName('Part');
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const partTitleElements = part.getElementsByTagName('PartTitle');
    const partTitle: string | null = partTitleElements.length > 0 ? partTitleElements[0].textContent?.trim() || null : null;
    if (partTitle) {
      markdown += `## ${partTitle}\n\n`;
    }

    // 章を処理
    const chapters = part.getElementsByTagName('Chapter');
    for (let j = 0; j < chapters.length; j++) {
      const chapter = chapters[j];
      const chapterTitleElements = chapter.getElementsByTagName('ChapterTitle');
      const chapterTitle: string | null = chapterTitleElements.length > 0 ? chapterTitleElements[0].textContent?.trim() || null : null;
      if (chapterTitle) {
        markdown += `### ${chapterTitle}\n\n`;
      }

      // 節を処理
      const sections = chapter.getElementsByTagName('Section');
      for (let k = 0; k < sections.length; k++) {
        const section = sections[k];
        const sectionTitleElements = section.getElementsByTagName('SectionTitle');
        const sectionTitle: string | null = sectionTitleElements.length > 0 ? sectionTitleElements[0].textContent?.trim() || null : null;
        if (sectionTitle) {
          markdown += `#### ${sectionTitle}\n\n`;
        }

        // 条文を処理
        const articles = section.getElementsByTagName('Article');
        for (let l = 0; l < articles.length; l++) {
          markdown = processArticle(articles[l], markdown);
        }
      }

      // 章直下の条文も処理
      const directArticles = chapter.getElementsByTagName('Article');
      for (let l = 0; l < directArticles.length; l++) {
        if (directArticles[l].parentNode === chapter) {
          markdown = processArticle(directArticles[l], markdown);
        }
      }
    }
  }

  // 編に属さない条文も処理
  const lawBodyElements = doc.getElementsByTagName('LawBody');
  if (lawBodyElements.length > 0) {
    const mainBodyArticles = lawBodyElements[0].getElementsByTagName('Article');
    for (let i = 0; i < mainBodyArticles.length; i++) {
      if (mainBodyArticles[i].parentNode === lawBodyElements[0]) {
        markdown = processArticle(mainBodyArticles[i], markdown);
      }
    }
  }

  return markdown;
}

function processArticle(article: Element, markdown: string): string {
  const articleTitleElements = article.getElementsByTagName('ArticleTitle');
  const articleTitle: string | null = articleTitleElements.length > 0 ? articleTitleElements[0].textContent?.trim() || null : null;

  if (articleTitle) {
    markdown += `#### ${articleTitle}\n\n`;
  }

  // 項を処理（olリストで構造化）
  const paragraphs = article.getElementsByTagName('Paragraph');
  if (paragraphs.length > 1) {
    // 複数項がある場合はolで番号付きリスト
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];
      const sentenceElements = paragraph.getElementsByTagName('ParagraphSentence');
      const sentenceContent: string | null = sentenceElements.length > 0 ? sentenceElements[0].textContent?.trim().replace(/\s+/g, '') || null : null;

      if (sentenceContent) {
        markdown += `${i + 1}. ${sentenceContent}\n`;

        // 号を処理（olで番号付きリスト）
        const items = paragraph.getElementsByTagName('Item');
        for (let j = 0; j < items.length; j++) {
          const item = items[j];
          const itemSentenceElements = item.getElementsByTagName('ItemSentence');
          const itemSentence: string | null = itemSentenceElements.length > 0 ? itemSentenceElements[0].textContent?.trim().replace(/\s+/g, '') || null : null;
          if (itemSentence) {
            markdown += `   ${j + 1}. ${itemSentence}\n`;
          }
        }
      }
    }
    markdown += '\n';
  } else if (paragraphs.length === 1) {
    // 1項のみの場合は通常の段落
    const paragraph = paragraphs[0];
    const sentenceElements = paragraph.getElementsByTagName('ParagraphSentence');
    const sentenceContent: string | null = sentenceElements.length > 0 ? sentenceElements[0].textContent?.trim().replace(/\s+/g, '') || null : null;

    if (sentenceContent) {
      markdown += `${sentenceContent}\n\n`;

      // 号を処理（olで番号付きリスト）
      const items = paragraph.getElementsByTagName('Item');
      if (items.length > 0) {
        for (let j = 0; j < items.length; j++) {
          const item = items[j];
          const itemSentenceElements = item.getElementsByTagName('ItemSentence');
          const itemSentence: string | null = itemSentenceElements.length > 0 ? itemSentenceElements[0].textContent?.trim().replace(/\s+/g, '') || null : null;
          if (itemSentence) {
            markdown += `${j + 1}. ${itemSentence}\n`;
          }
        }
        markdown += '\n';
      }
    }
  }

  return markdown;
}

function saveToFile(content: string, filename: string = 'civil-code.md'): void {
  fs.writeFileSync(filename, content, 'utf8');
  console.log(`${filename} に保存しました`);
}

function convertCivilCodeToMarkdown(xmlFilePath: string): string {
  try {
    console.log(`XMLファイル ${xmlFilePath} を読み込み中...`);
    const xmlData: string = loadXml(xmlFilePath);

    console.log('Markdownに変換中...');
    const markdown: string = xmlToMarkdown(xmlData);

    console.log('ファイルに保存中...');
    saveToFile(markdown);

    console.log('変換完了！');
    return markdown;
  } catch (error) {
    console.error('変換に失敗しました:', error);
    throw error;
  }
}

convertCivilCodeToMarkdown('./civil-code.xml');
