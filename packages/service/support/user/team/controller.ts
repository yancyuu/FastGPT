import { TeamItemType, TeamMemberWithTeamSchema } from '@fastgpt/global/support/user/team/type';
import { Types } from '../../../common/mongo';
import {
  TeamMemberRoleEnum,
  TeamMemberStatusEnum,
  notLeaveStatus
} from '@fastgpt/global/support/user/team/constant';
import { MongoTeamMember } from './teamMemberSchema';
import { MongoTeam } from './teamSchema';
import { MongoUser } from './../schema';

async function getTeam(match: Record<string, any>): Promise<TeamItemType> {
  const tmb = (await MongoTeamMember.findOne(match).populate('teamId')) as TeamMemberWithTeamSchema;

  if (!tmb) {
    return Promise.reject('member not exist');
  }

  return {
    userId: String(tmb.userId),
    teamId: String(tmb.teamId._id),
    teamName: tmb.teamId.name,
    memberName: tmb.name,
    avatar: tmb.teamId.avatar,
    balance: tmb.teamId.balance,
    tmbId: String(tmb._id),
    role: tmb.role,
    status: tmb.status,
    defaultTeam: tmb.defaultTeam,
    canWrite: tmb.role !== TeamMemberRoleEnum.visitor,
    maxSize: tmb.teamId.maxSize
  };
}

export async function getTeamInfoByTmbId({ tmbId }: { tmbId: string }) {
  if (!tmbId) {
    return Promise.reject('tmbId or userId is required');
  }
  return getTeam({
    _id: new Types.ObjectId(tmbId),
    status: notLeaveStatus
  });
}

export async function getUserDefaultTeam({ userId }: { userId: string }) {
  if (!userId) {
    return Promise.reject('tmbId or userId is required');
  }
  return getTeam({
    userId: new Types.ObjectId(userId),
    defaultTeam: true
  });
}
export async function createDefaultTeam({
  userId,
  teamName = 'LazyGPT',
  avatar = '/icon/logo.svg',
  balance,
  maxSize = 5
}: {
  userId: string;
  teamName?: string;
  avatar?: string;
  balance?: number;
  maxSize?: number;
}) {
  // auth default team
  const tmb = await MongoTeamMember.findOne({
    userId: new Types.ObjectId(userId),
    defaultTeam: true
  });

  if (!tmb) {
    console.log('create default team', userId);

    // create
    const { _id: insertedId } = await MongoTeam.create({
      ownerId: userId,
      name: teamName,
      avatar,
      balance,
      maxSize,
      createTime: new Date()
    });
    await MongoTeamMember.create({
      teamId: insertedId,
      userId,
      name: 'Owner',
      role: TeamMemberRoleEnum.admin,
      status: TeamMemberStatusEnum.active,
      createTime: new Date(),
      defaultTeam: true
    });
  } else {
    console.log('default team exist', userId);
    await MongoTeam.findByIdAndUpdate(tmb.teamId, {
      $set: {
        ...(balance !== undefined && { balance }),
        maxSize
      }
    });
  }
}

//在团队成员创建逻辑中，确保将传入的 userId 作为团队成员添加到 root 用户的默认团队
export async function setDefaultTeam({
  userId,
  balance,
  maxSize = 5
}: {
  userId: string;
  balance?: number;
  maxSize?: number;
}) {
  try {
    // 获取 root 用户信息
    const rootUser = await MongoUser.findOne({ username: 'root' });
    if (!rootUser) {
      throw new Error('未能找到 root 用户');
    }

    // 获取 root 用户的默认团队
    const tmb = await MongoTeamMember.findOne({
      userId: new Types.ObjectId(rootUser.id),
      defaultTeam: true
    });

    if (!tmb) {
      throw new Error('未能找到 root 用户的团队');
    }

    console.log('default team for root user already exists', rootUser.id);

    // 更新团队信息
    await MongoTeam.findByIdAndUpdate(tmb.teamId, {
      $set: {
        ...(balance !== undefined && { balance }),
        maxSize
      }
    });

    // 添加新成员到 root 用户的团队
    await MongoTeamMember.create({
      teamId: tmb.teamId,
      userId, // 新成员的 ID
      name: 'Member',
      role: TeamMemberRoleEnum.owner,
      status: TeamMemberStatusEnum.active,
      createTime: new Date(),
      defaultTeam: true
    });
  } catch (error) {
    console.error('设置默认团队时出错:', error);
    // 根据您的应用需求，这里可以返回错误信息或进行其他处理
  }
}
