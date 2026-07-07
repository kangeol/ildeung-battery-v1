# Vehicle Master DB

`master-db` 폴더는 제조사별 차량 배터리 Master DB 엑셀 파일을 보관하는 폴더입니다.

제조사별 엑셀 파일은 이 폴더에 넣은 뒤 변환 명령어를 실행합니다.

## 파일명 예시

- `hyundai.xlsx`
- `kia.xlsx`
- `chevrolet.xlsx`

## 엑셀 컬럼 구조

엑셀 첫 번째 시트에는 아래 컬럼명이 필요합니다.

- `제조사`
- `차량명`
- `차량년식`
- `연료`
- `세부모델`
- `기본배터리`
- `업그레이드배터리`
- `검수상태`

## 변환 명령어

```bash
npm run convert
```

## 변환 후 생성되는 파일

- `data/manufacturers.json`
- `data/hyundai.json`
- `data/kia.json`

## 주의사항

JSON 파일은 직접 수정하지 말고, `master-db` 폴더의 엑셀 파일을 수정한 뒤 다시 변환합니다.
