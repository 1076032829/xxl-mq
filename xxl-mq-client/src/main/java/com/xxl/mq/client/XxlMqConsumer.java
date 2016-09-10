package com.xxl.mq.client;

import com.xxl.mq.client.consumer.IMqConsumer;
import com.xxl.mq.client.consumer.annotation.MqConsumer;
import com.xxl.mq.client.consumer.annotation.MqConsumerType;
import com.xxl.mq.client.consumer.remote.XxlMqClient;
import com.xxl.mq.client.message.MessageStatus;
import com.xxl.mq.client.message.XxlMqMessage;
import com.xxl.mq.client.rpc.util.DateFormatUtil;
import com.xxl.mq.client.rpc.util.JacksonUtil;
import com.xxl.mq.client.rpc.util.ZkConsumerUtil;
import org.jboss.netty.util.internal.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.BeansException;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationContextAware;

import java.text.MessageFormat;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static com.xxl.mq.client.consumer.annotation.MqConsumerType.*;

/**
 * Created by xuxueli on 16/8/28.
 */
public class XxlMqConsumer implements ApplicationContextAware {
    private final static Logger logger = LoggerFactory.getLogger(XxlMqConsumer.class);

    @Override
    public void setApplicationContext(ApplicationContext applicationContext) throws BeansException {

        // init consumer respository
        Map<String, Object> serviceMap = applicationContext.getBeansWithAnnotation(MqConsumer.class);
        if (serviceMap!=null && serviceMap.size()>0) {
            for (Object serviceBean : serviceMap.values()) {
                if (serviceBean instanceof IMqConsumer) {
                    // valid
                    MqConsumer annotation = serviceBean.getClass().getAnnotation(MqConsumer.class);
                    MqConsumerType type = annotation.type();
                    String name = annotation.value();
                    if (type==null || name==null || name.trim().length()==0) {
                        return;
                    }
                    // init mq thread for each consumer
                    IMqConsumer consumerHandler = (IMqConsumer) serviceBean;
                    ConsumerThread mqThread = new ConsumerThread(consumerHandler);
                    consumerRespository.put(name, mqThread);
                }
            }
        }
        if (consumerRespository ==null || consumerRespository.size()==0) {
            return;
        }

        // registry consumer, and fresh each 60s
        try {
            ZkConsumerUtil.registerConsumers(consumerRespository.keySet());
        } catch (Exception e) {
            logger.error("", e);
        }
        executor.execute(new Runnable() {
            @Override
            public void run() {
                while (true) {
                    // registry
                    try {
                        TimeUnit.SECONDS.sleep(60);
                        ZkConsumerUtil.registerConsumers(consumerRespository.keySet());
                    } catch (Exception e) {
                        logger.error("", e);
                    }
                }
            }
        });

        // consumer thread start
        for (Map.Entry<String, ConsumerThread> item: consumerRespository.entrySet()) {
            item.getValue().start();
            MqConsumer annotation = item.getValue().getConsumerHandler().getClass().getAnnotation(MqConsumer.class);
            logger.info(">>>>>>>>>>> xxl-mq, consumer thread start, name={}, type={}", annotation.value(), annotation.type());
        }

    }

    // fresh consumer
    private static Executor executor = Executors.newCachedThreadPool();

    // consumer respository
    private static ConcurrentHashMap<String, ConsumerThread> consumerRespository = new ConcurrentHashMap<String, ConsumerThread>();

    // consumer thread
    public static class ConsumerThread extends Thread {

        private IMqConsumer consumerHandler;
        public ConsumerThread(IMqConsumer consumerHandler) {
            this.consumerHandler = consumerHandler;
        }
        public IMqConsumer getConsumerHandler() {
            return consumerHandler;
        }

        @Override
        public void run() {
            MqConsumer annotation = consumerHandler.getClass().getAnnotation(MqConsumer.class);

            int pagesize = 10;
            int waitTim = 5;

            if (annotation.type()==SERIAL_QUEUE || annotation.type()==QUEUE) {
                while (true) {
                    try {
                        // check load
                        ZkConsumerUtil.ActiveInfo checkPull = ZkConsumerUtil.isActice(annotation);
                        if (checkPull!=null) {
                            logger.info(">>>>>>>>>>> xxl-mq, isActice: consumer={}, ActiveInfo={}", annotation, checkPull.toString());

                            // load
                            List<XxlMqMessage> messageList =  XxlMqClient.getXxlMqService().pullNewMessage(annotation.value(), pagesize, checkPull.rank, checkPull.total);
                            if (messageList!=null && messageList.size()>0) {
                                waitTim = 0;
                                for (XxlMqMessage msg: messageList) {

                                    // check consumer
                                    ZkConsumerUtil.ActiveInfo checkConsume = ZkConsumerUtil.isActice(annotation);
                                    if (!(checkConsume!=null && checkConsume.rank==checkPull.rank && checkConsume.total==checkPull.total)) {
                                        break;
                                    }

                                    String tim = DateFormatUtil.formatDateTime(new Date());

                                    // lock message
                                    String lockAddMsg = MessageFormat.format("<hr>》》》时间: {0} <br>》》》 消息锁定(status>>>ING)<br>》》》操作: 注册信息: {1}", tim, checkConsume.toString());
                                    int lockRet = XxlMqClient.getXxlMqService().lockMessage(msg.getId(), lockAddMsg);
                                    if (lockRet<1){
                                        continue;
                                    }

                                    try {
                                        // consume message
                                        Map<String, String> data = null;
                                        if (msg.getData()!=null && msg.getData().trim().length()>0) {
                                            data = JacksonUtil.readValue(msg.getData(), Map.class);
                                        }
                                        consumerHandler.consume(data);

                                        // consume suceess
                                        msg.setStatus(MessageStatus.SUCCESS.name());
                                        msg.setMsg(MessageFormat.format("<hr>》》》时间: {0} <br>》》》操作: 消息消费成功(status>>>SUCCESS) <br>》》》注册信息: {1}", tim, checkConsume.toString()));
                                    } catch (Exception e) {
                                        logger.error("", e);

                                        // consume error
                                        msg.setStatus(MessageStatus.FAIL.name());
                                        msg.setMsg(MessageFormat.format("<hr>》》》时间: {0} <br>》》》操作: 消息消费失败(status>>>FAIL) <br>》》》注册信息: {1} <br>》》》日志:{2}", tim, checkConsume.toString(), e.getMessage()));
                                    } finally {
                                        XxlMqClient.getXxlMqService().consumeCallbackMessage(msg);
                                        logger.info(">>>>>>>>>> xxl-mq, consumer message: {}", msg);
                                    }

                                }
                            }

                            waitTim = (waitTim<60) ? (waitTim+5) : waitTim;
                            if (waitTim>0) {
                                TimeUnit.SECONDS.sleep(waitTim);
                            }

                        } else {
                            TimeUnit.SECONDS.sleep(5);
                            logger.debug(">>>>>>>>>>> xxl-mq, isActice(QUEUE) fail, registryKey:{}", annotation.value());
                        }

                    } catch (Exception e) {
                        try {
                            TimeUnit.SECONDS.sleep(2);
                        } catch (Exception e1) {
                            logger.error("", e1);
                        }
                        logger.error("", e);
                    }
                }
            } else if (annotation.type() == TOPIC){
                // TODO
            }
        }
    }

}
