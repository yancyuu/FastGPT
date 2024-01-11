import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@/service/mongo';
import { MongoApp } from '@fastgpt/service/core/app/schema';
import { mongoRPermission } from '@fastgpt/global/support/permission/utils';
import { authUserRole } from '@fastgpt/service/support/permission/auth/user';

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    await connectToDatabase();
    // 凭证校验
    const { teamId, tmbId, teamOwner, role } = await authUserRole({ req, authToken: true });

    // 解析请求参数
    const pageNum = parseInt(req.query.pageNum as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 24;
    const searchText = (req.query.searchText as string) || '';

    // 构建查询条件
    const query = {
      ...mongoRPermission({ teamId, tmbId, role }),
      permission: 'public',
      ...(searchText && { name: { $regex: searchText, $options: 'i' } })
    };

    // 分页处理
    const skip = (pageNum - 1) * pageSize;

    // 查询总数，用于分页
    const totalCount = await MongoApp.countDocuments(query);

    // 根据查询条件获取模型信息
    const myApps =
      (await MongoApp.find(query).skip(skip).limit(pageSize).sort({ updateTime: -1 })) || []; // 确保myApps不是undefined

    // 将数据映射为前端所需的格式
    const formattedData = myApps.map((app) => ({
      _id: app._id.toString(), // 确保_id被转换为字符串
      avatar: app.avatar, // 提供默认头像
      name: app.name || '未命名应用', // 提供默认名称
      intro: app.intro || '无简介', // 提供默认简介
      userId: app.userId, // 提供默认用户ID
      share: app.permission === 'public',
      isCollection: false // 根据业务逻辑确定是否被收藏
    }));

    // 返回数据和分页信息
    jsonRes(res, {
      data: {
        data: formattedData,
        total: totalCount
      }
    });
  } catch (err) {
    jsonRes(res, {
      code: 500,
      error: '在处理您的请求时发生错误'
    });
  }
}
