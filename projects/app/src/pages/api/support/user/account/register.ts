import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { MongoUser } from '@fastgpt/service/support/user/schema';
import { connectToDatabase } from '@/service/mongo';
import type { PostRegisterProps } from '@fastgpt/global/support/user/api.d';
import { createDefaultTeam } from '@fastgpt/service/support/user/team/controller';
import { PRICE_SCALE } from '@fastgpt/global/support/wallet/bill/constants';

export default async function registerHandler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await connectToDatabase();
    const { username, password, authCode } = req.body as PostRegisterProps;

    // 从环境变量获取有效的授权码列表
    const validAuthorizationCodes = process.env.REGISTRATION_AUTH_CODE?.split(',') || [];

    if (!username || !password || !authCode) {
      throw new Error('缺少必要参数');
    }

    // 检查授权码是否在有效列表中
    if (!validAuthorizationCodes.includes(authCode)) {
      throw new Error('无效的授权码');
    }

    // 检查用户名是否已被占用
    const existingUser = await MongoUser.findOne({ username });
    if (existingUser) {
      throw new Error('用户名已被占用');
    }

    // 创建新用户
    const newUser = new MongoUser({
      username,
      password
      // 其他需要的用户信息
    });
    await newUser.save();
    // 创建默认team
    await createDefaultTeam({ userId: newUser._id, maxSize: 1, balance: 9999 * PRICE_SCALE });
    jsonRes(res, {
      data: {
        message: '注册成功',
        userId: newUser._id
      }
    });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: '注册过程中发生错误'
    });
  }
}
