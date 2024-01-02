import React, { useState, Dispatch, useCallback } from 'react';
import { FormControl, Box, Input, Button, FormErrorMessage, Flex } from '@chakra-ui/react';
import { useForm } from 'react-hook-form';
import { PageTypeEnum } from '@/constants/user';
import { postRegister } from '@/web/support/user/api';
import { useToast } from '@/web/common/hooks/useToast';
import { feConfigs } from '@/web/common/system/staticData';

interface Props {
  loginSuccess: (e: ResLogin) => void;
  setPageType: Dispatch<`${PageTypeEnum}`>;
}

interface RegisterType {
  username: string;
  password: string;
  password2: string;
  authCode: string;  // 授权码字段
}

const RegisterForm = ({ setPageType, loginSuccess }: Props) => {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<RegisterType>({
    mode: 'onBlur'
  });

  const [requesting, setRequesting] = useState(false);

  const onclickRegister = useCallback(
    async ({ username, password, password2, authCode }: RegisterType) => {
      setRequesting(true);
      try {
        loginSuccess(
          await postRegister({
            username,
            password,
            authCode, // 使用授权码代替密码
            inviterId: localStorage.getItem('inviterId') || undefined
          })
        );
        toast({
          title: `注册成功`,
          status: 'success'
        });
      } catch (error: any) {
        toast({
          title: error.message || '注册异常',
          status: 'error'
        });
      }
      setRequesting(false);
    },
    [loginSuccess, toast]
  );

  return (
    <>
      <Box fontWeight={'bold'} fontSize={'2xl'} textAlign={'center'}>
        注册 {feConfigs?.systemTitle} 账号
      </Box>
      <Box mt={'42px'}>
        <FormControl isInvalid={!!errors.username}>
          <Input
            bg={'myGray.50'}
            placeholder="邮箱/手机号"
            {...register('username', {
              required: '邮箱/手机号不能为空'
            })}
          ></Input>
        </FormControl>
        <FormControl mt={6} isInvalid={!!errors.password}>
          <Input
            bg={'myGray.50'}
            type={'password'}
            placeholder="密码(4~20位)"
            {...register('password', {
              required: '密码不能为空',
              minLength: {
                value: 4,
                message: '密码最少 4 位最多 20 位'
              },
              maxLength: {
                value: 20,
                message: '密码最少 4 位最多 20 位'
              }
            })}
          ></Input>
        </FormControl>
        <FormControl mt={6} isInvalid={!!errors.password2}>
          <Input
            bg={'myGray.50'}
            type={'password'}
            placeholder="确认密码"
            {...register('password2', {
              validate: (val) => (getValues('password') === val ? true : '两次密码不一致')
            })}
          ></Input>
        <FormControl mt={8} isInvalid={!!errors.authCode}>
          <Input
            type={'text'}
            placeholder="授权码"
            size={['md', 'lg']}
            {...register('authCode', {
              required: '授权码不能为空'
            })}
          ></Input>
          <FormErrorMessage position={'absolute'} fontSize="xs">
            {!!errors.authCode && errors.authCode.message}
          </FormErrorMessage>
        </FormControl>
        <Button
          type="submit"
          mt={6}
          w={'100%'}
          size={['md', 'lg']}
          colorScheme="blue"
          isLoading={requesting}
          onClick={handleSubmit(onclickRegister)}
        >
          确认注册
        </Button>
        <Box
          float={'right'}
          fontSize="sm"
          mt={2}
          mb={'50px'}
          color={'primary.700'}
          cursor={'pointer'}
          _hover={{ textDecoration: 'underline' }}
          onClick={() => setPageType('login')}
        >
          已有账号，去登录
        </Box>
      </Box>
    </>
  );
};

export default RegisterForm;
