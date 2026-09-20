# 当前发布规则（优先于下方旧部署记录）

Pages 已切换为 GitHub Actions，工作流 `.github/workflows/pages.yml`。修改后提交相关静态文件并 `git push github master` 即可。每次新发布自动显示 `0.0.N`（工作流运行序号）；重试同一次运行不增加。不要切回分支发布，否则会绕过自动版本生成。可以通过 `gh run list --repo RRRoger/page0` 查看发布情况。线上版本以页面和 `version.json` 为准。

---

# 部署到 GitHub Pages

## 当前项目

- 本地仓库：`/Users/chenpeng/workdir/page0`
- GitHub 仓库：https://github.com/RRRoger/page0
- 网站地址：https://rrroger.github.io/page0/
- 发布分支：`master`
- 发布目录：仓库根目录 `/`
- 网站入口：`index.html`
- GitHub 远程名称：`github`
- Gitee 远程名称：`origin`

本项目已完成首次部署。日常修改页面时，直接按照下面的“更新网站”操作即可。

## 更新网站

修改 `index.html` 或其他静态资源后，在终端执行：

```bash
cd /Users/chenpeng/workdir/page0
git status
git add index.html
# 如果还修改了 CSS、JavaScript 或图片，也将对应文件加入暂存区。
git diff --cached
git commit -m "Update website"
git push github master
```

推送后，GitHub Pages 会自动构建并发布。部署完成后访问：

https://rrroger.github.io/page0/

注意：`git push origin master` 推送到 Gitee，不会触发本项目的 GitHub Pages 部署。不要提交 token、私钥、密码或其他敏感文件。

## 查看部署状态

```bash
gh run list --repo RRRoger/page0 --limit 5
```

找到最新的 `pages build and deployment` 运行记录，用实际运行 ID 替换下面的 `RUN_ID`：

```bash
gh run watch RUN_ID --repo RRRoger/page0 --exit-status
```

也可以在浏览器查看：https://github.com/RRRoger/page0/actions

验证公网页面：

```bash
curl --fail --location https://rrroger.github.io/page0/
```

## 首次部署步骤（供参考）

以下操作已经执行过，当前仓库无需重复创建。

### 1. 登录 GitHub CLI

安装 `gh` 后，执行：

```bash
gh auth login
gh auth status
```

按提示完成 GitHub 登录。Gitee token 不能用于 GitHub。

### 2. 创建公开仓库并推送

确保本地项目已初始化 Git、提交过代码，且仓库根目录有 `index.html`。
GitHub Free 可为公开仓库启用 Pages。

本项目首次创建时使用：

```bash
cd /Users/chenpeng/workdir/page0
gh repo create RRRoger/page0 --public --source=. --remote=github --push
```

这条命令会创建 GitHub 仓库、添加名为 `github` 的远程地址并推送当前分支。若仓库已存在，不要重复运行创建命令。

### 3. 启用 GitHub Pages

本项目首次启用时使用：

```bash
gh api --method POST repos/RRRoger/page0/pages \
  -f 'source[branch]=master' \
  -f 'source[path]=/'
```

也可以通过网页配置：

1. 打开 https://github.com/RRRoger/page0/settings/pages
2. 在 **Build and deployment** 中，将 **Source** 设为 **Deploy from a branch**。
3. 分支选择 **master**，目录选择 **/ (root)**。
4. 点击 **Save**，等待部署完成。

查看现有配置：

```bash
gh api repos/RRRoger/page0/pages --jq '{html_url,status,source}'
```

## 页面编写注意事项

- GitHub Pages 用于发布静态 HTML、CSS、JavaScript 和图片，不运行服务端程序或数据库。
- 本站路径含 `/page0/`，资源建议使用 `./style.css`、`./images/logo.png` 等相对路径，避免 `/style.css` 指向域名根目录。
- 文件名大小写要一致，例如 `Logo.png` 和 `logo.png` 是不同路径。
- 页面没有立即更新时，先确认 Actions 部署成功，再刷新浏览器。

## 官方文档

- 创建 Pages 网站：https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- 配置发布源：https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
