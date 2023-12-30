import { OAuthEnum } from './constant';

export type PostLoginProps = {
  username: string;
  password: string;
  tmbId?: string;
};

export type OauthLoginProps = {
  type: `${OAuthEnum}`;
  code: string;
  callbackUrl: string;
  inviterId?: string;
  tmbId?: string;
};

export type FastLoginProps = {
  token: string;
  code: string;
};

// 添加注册的数据类型
export type PostRegisterProps = {
  username: string;
  email: string;
  authCode: string; // 授权码
  inviterId?: string; // 可选的邀请人ID
};