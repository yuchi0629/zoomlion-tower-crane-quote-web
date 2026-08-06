# 中联塔机配置确认及报价单生成软件 V1.1 Web版

这是一个无需后端和数据库的静态 Web 版本，运行时直接读取仓库中的 JSON 数据文件，适合部署到 GitHub Pages。

## 功能范围

- 产品型号和安装形式选择
- 标准配置信息展示
- 产品基本配置展示
- 可选增减配置勾选、数量、增配/减配和参考价格计算
- 包内容查看
- 报价单信息录入
- 打印报价单
- 打印 LTC 选配指导文件
- 导出配置及增减配 CSV 清单
- 导出/导入前端 JSON 数据

## 数据文件

业务数据位于：

```text
public/data/app-data.json
```

当前已内置 `R220-10RA(CE)`，包含：

- 支腿固定式：基本配置 46 行，增减配 29 行
- 底架固定式：基本配置 47 行，增减配 29 行

## 本地运行

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

GitHub Pages 由 `.github/workflows/pages.yml` 自动构建和发布。
