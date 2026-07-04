# myMoney

出差报销记账系统，框架与 `LuckyStunWeb-next` 保持一致：Next App Router、Tailwind CSS、shadcn 风格组件、lucide 图标、PostgreSQL。

## 功能

- 快速记录出差支出：金额、标题、分类、行程、日期、支付方式、发票状态、报销状态。
- 智能识别输入：一句话解析成账单字段，并支持浏览器语音识别能力。
- 历史检索：按标题、分类、行程、备注、金额搜索。
- 统计看板：本月周趋势、分类分布、行程预算对比。
- 分类与行程管理：内置餐饮、交通、住宿、机票高铁等报销常用分类。
- CSV 导出：导出当前筛选结果用于报销整理。

## 数据库

`.env.local` 已按本机配置填写：

```bash
DB_HOST=192.168.31.80
DB_PORT=5432
DB_NAME=myMoney
DB_USER=myMoney
DB_PASSWORD=******
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=******
AI_MODEL=gpt-4o-mini
```

首次访问 API 时会自动创建：

- `my_money_categories`
- `my_money_trips`
- `my_money_expenses`

## AI 语音解析

浏览器负责把语音转成文字，后端 `POST /api/ai/parse-expense` 负责调用 AI 把文字解析成账单字段。

AI 接口使用 OpenAI 兼容的 `chat/completions` 协议：

- `AI_BASE_URL`: API 地址，例如 `https://api.openai.com/v1` 或你的中转地址。
- `AI_API_KEY`: API Key。
- `AI_MODEL`: 解析模型，默认示例为 `gpt-4o-mini`。

语音输入只使用浏览器自带的 `SpeechRecognition` / `webkitSpeechRecognition` 做实时识别，不再上传录音做 AI 转写。浏览器不支持或识别失败时，可以直接在识别结果框里手动输入或修改文字，再调用 `/api/ai/parse-expense` 解析账单字段。如果 AI 未配置或调用失败，前端会用本地规则兜底解析，不影响手动记账。

## 开发

```bash
yarn install
yarn dev
```

本次生成代码未运行 build 或 dev。
