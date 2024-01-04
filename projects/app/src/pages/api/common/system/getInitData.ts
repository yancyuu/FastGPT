import type { FastGPTFeConfigsType } from '@fastgpt/global/common/system/types/index.d';
import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { readFileSync, readdirSync } from 'fs';
import type { InitDateResponse } from '@/global/common/api/systemRes';
import type { FastGPTConfigFileType } from '@fastgpt/global/common/system/types/index.d';
import { formatPrice } from '@fastgpt/global/support/wallet/bill/tools';
import { getTikTokenEnc } from '@fastgpt/global/common/string/tiktoken';
import { initHttpAgent } from '@fastgpt/service/common/middle/httpAgent';
import { SimpleModeTemplate_FastGPT_Universal } from '@/global/core/app/constants';
import { getSimpleTemplatesFromPlus } from '@/service/core/app/utils';
import { PluginSourceEnum } from '@fastgpt/global/core/plugin/constants';
import { getFastGPTConfigFromDB } from '@fastgpt/service/common/system/config/controller';
import { connectToDatabase } from '@/service/mongo';
import { PluginTemplateType } from '@fastgpt/global/core/plugin/type';
import { readConfigData } from '@/service/common/system';
import { exit } from 'process';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await getInitConfig();

  jsonRes<InitDateResponse>(res, {
    data: {
      feConfigs: global.feConfigs,
      chatModels: global.chatModels,
      qaModels: global.qaModels,
      cqModels: global.cqModels,
      extractModels: global.extractModels,
      vectorModels: global.vectorModels,
      reRankModels:
        global.reRankModels?.map((item) => ({
          ...item,
          requestUrl: undefined,
          requestAuth: undefined
        })) || [],
      audioSpeechModels: global.audioSpeechModels,
      priceMd: global.priceMd,
      systemVersion: global.systemVersion || '0.0.0',
      simpleModeTemplates: global.simpleModeTemplates
    }
  });
}

const defaultFeConfigs: FastGPTFeConfigsType = {
  show_emptyChat: true,
  show_git: false,
  show_register: true,
  docUrl: 'https://doc.fastgpt.in',
  openAPIDocUrl: 'https://doc.fastgpt.in/docs/development/openapi',
  systemTitle: 'LazyGPT',
  concatMd:
    '## 📱 联系我 \
  感兴趣并想了解更多信息？欢迎添加我的微信，一起交流分享！\
  - **微信号**: `ToLiveIsToRest` _(点击复制)_\
  或者，您可以直接扫描下方的二维码添加我为好友:\
  ![微信二维码](https://your-qr-code-image-url.png)\
  _期待与您的交流！_',
  limit: {
    exportLimitMinutes: 0
  },
  scripts: [],
  favicon: '/favicon.ico'
};

export async function getInitConfig() {
  try {
    if (global.feConfigs) return;
    await connectToDatabase();

    initGlobal();
    await initSystemConfig();
  } catch (error) {
    console.error('Load init config error', error);

    if (!global.feConfigs) {
      exit(1);
    }
  }
  await getSimpleModeTemplates();

  getSystemVersion();
  countModelPrice();
  getSystemPlugin();

  console.log({
    feConfigs: global.feConfigs,
    systemEnv: global.systemEnv,
    chatModels: global.chatModels,
    qaModels: global.qaModels,
    cqModels: global.cqModels,
    extractModels: global.extractModels,
    qgModels: global.qgModels,
    vectorModels: global.vectorModels,
    reRankModels: global.reRankModels,
    audioSpeechModels: global.audioSpeechModels,
    whisperModel: global.whisperModel,
    price: global.priceMd,
    simpleModeTemplates: global.simpleModeTemplates,
    communityPlugins: global.communityPlugins
  });
}

export async function initSystemConfig() {
  // load config
  const [dbConfig, fileConfig] = await Promise.all([
    getFastGPTConfigFromDB(),
    readConfigData('config.json')
  ]);
  const fileRes = JSON.parse(fileConfig) as FastGPTConfigFileType;

  // get config from database
  const config: FastGPTConfigFileType = {
    feConfigs: {
      ...defaultFeConfigs,
      ...(fileRes.feConfigs || {}),
      ...(dbConfig.feConfigs || {})
    },
    systemEnv: fileRes.systemEnv,
    chatModels: dbConfig.chatModels || fileRes.chatModels || [],
    qaModels: dbConfig.qaModels || fileRes.qaModels || [],
    cqModels: dbConfig.cqModels || fileRes.cqModels || [],
    extractModels: dbConfig.extractModels || fileRes.extractModels || [],
    qgModels: dbConfig.qgModels || fileRes.qgModels || [],
    vectorModels: dbConfig.vectorModels || fileRes.vectorModels || [],
    reRankModels: dbConfig.reRankModels || fileRes.reRankModels || [],
    audioSpeechModels: dbConfig.audioSpeechModels || fileRes.audioSpeechModels || [],
    whisperModel: dbConfig.whisperModel || fileRes.whisperModel
  };

  // set config
  global.feConfigs = {
    isPlus: !!config.systemEnv.pluginBaseUrl,
    ...config.feConfigs
  };
  global.systemEnv = config.systemEnv;

  global.chatModels = config.chatModels || [];
  global.qaModels = config.qaModels || [];
  global.cqModels = config.cqModels || [];
  global.extractModels = config.extractModels || [];
  global.qgModels = config.qgModels || [];
  global.vectorModels = config.vectorModels || [];
  global.reRankModels = config.reRankModels || [];
  global.audioSpeechModels = config.audioSpeechModels || [];
  global.whisperModel = config.whisperModel;

  global.priceMd = '';
}

export function initGlobal() {
  global.communityPlugins = [];
  global.simpleModeTemplates = [];
  global.qaQueueLen = global.qaQueueLen ?? 0;
  global.vectorQueueLen = global.vectorQueueLen ?? 0;
  // init tikToken
  getTikTokenEnc();
  initHttpAgent();
}

export function getSystemVersion() {
  try {
    if (process.env.NODE_ENV === 'development') {
      global.systemVersion = process.env.npm_package_version || '0.0.0';
    } else {
      const packageJson = JSON.parse(readFileSync('/app/package.json', 'utf-8'));

      global.systemVersion = packageJson?.version;
    }
    console.log(`System Version: ${global.systemVersion}`);
  } catch (error) {
    console.log(error);

    global.systemVersion = '0.0.0';
  }
}

export function countModelPrice() {
  global.priceMd = `| 计费项 | 价格: 元/ 1K tokens(包含上下文)|
| --- | --- |
${global.vectorModels
  ?.map((item) => `| 索引-${item.name} | ${formatPrice(item.price, 1000)} |`)
  .join('\n')}
${global.chatModels
  ?.map((item) => `| 对话-${item.name} | ${formatPrice(item.price, 1000)} |`)
  .join('\n')}
${global.qaModels
  ?.map((item) => `| 文件QA拆分-${item.name} | ${formatPrice(item.price, 1000)} |`)
  .join('\n')}
${global.cqModels
  ?.map((item) => `| 问题分类-${item.name} | ${formatPrice(item.price, 1000)} |`)
  .join('\n')}
${global.extractModels
  ?.map((item) => `| 内容提取-${item.name} | ${formatPrice(item.price, 1000)} |`)
  .join('\n')}
${global.qgModels
  ?.map((item) => `| 下一步指引-${item.name} | ${formatPrice(item.price, 1000)} |`)
  .join('\n')}
${global.audioSpeechModels
  ?.map((item) => `| 语音播放-${item.name} | ${formatPrice(item.price, 1000)} |`)
  .join('\n')}
${
  global.whisperModel
    ? `| 语音输入-${global.whisperModel.name} | ${global.whisperModel.price}/分钟 |`
    : ''
}
`;
}

async function getSimpleModeTemplates() {
  if (global.simpleModeTemplates && global.simpleModeTemplates.length > 0) return;

  try {
    const basePath =
      process.env.NODE_ENV === 'development' ? 'data/simpleTemplates' : '/app/data/simpleTemplates';
    // read data/simpleTemplates directory, get all json file
    const files = readdirSync(basePath);
    // filter json file
    const filterFiles = files.filter((item) => item.endsWith('.json'));

    // read json file
    const fileTemplates = filterFiles.map((item) => {
      const content = readFileSync(`${basePath}/${item}`, 'utf-8');
      return {
        id: item.replace('.json', ''),
        ...JSON.parse(content)
      };
    });

    // fetch templates from plus
    const plusTemplates = await getSimpleTemplatesFromPlus();

    global.simpleModeTemplates = [
      SimpleModeTemplate_FastGPT_Universal,
      ...plusTemplates,
      ...fileTemplates
    ];
  } catch (error) {
    global.simpleModeTemplates = [SimpleModeTemplate_FastGPT_Universal];
  }
}

function getSystemPlugin() {
  if (global.communityPlugins && global.communityPlugins.length > 0) return;

  const basePath =
    process.env.NODE_ENV === 'development' ? 'data/pluginTemplates' : '/app/data/pluginTemplates';
  // read data/pluginTemplates directory, get all json file
  const files = readdirSync(basePath);
  // filter json file
  const filterFiles = files.filter((item) => item.endsWith('.json'));

  // read json file
  const fileTemplates: PluginTemplateType[] = filterFiles.map((filename) => {
    const content = readFileSync(`${basePath}/${filename}`, 'utf-8');
    return {
      ...JSON.parse(content),
      id: `${PluginSourceEnum.community}-${filename.replace('.json', '')}`,
      source: PluginSourceEnum.community
    };
  });

  global.communityPlugins = fileTemplates;
}
