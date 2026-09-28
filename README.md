# 하루 한 단어 · 汉语

하루에 중국어 단어 하나씩, 천천히 쌓아가는 개인 학습 앱입니다.
설치도 로그인도 필요 없고, 휴대폰 홈 화면에 추가하면 앱처럼 쓸 수 있어요.

## 학습 설계

| 원리 | 앱에서는 |
| --- | --- |
| **기존 지식 연결** | 한국어 한자어(學生 학생, 關係 관계…)와 이어서 새로 외울 것을 줄여요 |
| **인출 연습** | 뜻은 가려져 있어요. 먼저 떠올린 뒤 탭해서 확인해요 |
| **간격 반복** | 1·3·7·14·30일 전 단어가 복습 탭에 다시 나와요 |
| **속도 조절** | 새 단어는 하루에 딱 하나만 열려요. 앞질러 갈 수 없어요 |
| **성조 시각화** | 병음을 성조별 색으로 구분해요 (1성 빨강 · 2성 주황 · 3성 초록 · 4성 파랑) |

발음은 기기에 내장된 중국어 음성(Web Speech API)을 씁니다.

## 구성

```
public/
  index.html   화면 뼈대
  style.css    디자인 (나눔고딕 + Noto Sans SC)
  app.js       진도·복습·음성 로직
  words.js     100일치 단어 데이터  ← 단어를 추가·수정하려면 여기
  sw.js        오프라인 캐시
scripts/
  check-words.js  단어 데이터 검증 (글자 수 = 병음 음절 수)
  make-icons.js   아이콘 PNG 생성
```

학습 기록은 브라우저(localStorage)에만 저장됩니다. 기기를 바꾸면 기록은 옮겨지지 않아요.

## 단어 추가하기

`public/words.js` 배열 끝에 같은 형식으로 추가하면 Day 101부터 이어집니다.
병음은 **글자마다 띄어 써야** 해요 (`"xiè xie"`). 추가한 뒤 `node scripts/check-words.js`로 확인하세요.
100개를 다 배우고 나면 처음부터 2회차가 시작됩니다.

## 배포 (GitHub Pages)

1. 저장소 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 설정
2. 기본 브랜치에 push하면 `.github/workflows/deploy.yml`이 자동 배포
3. 주소: `https://<사용자명>.github.io/hanyu/`

## 로컬 실행

```bash
python3 -m http.server 8000 -d public
# http://localhost:8000
```
