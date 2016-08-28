package com.xxl.mq.broker.dao;

import com.xxl.mq.broker.core.model.XxlMqMessage;

import java.util.List;

/**
 * Created by xuxueli on 16/8/28.
 */
public interface IXxlMqMessageDao {

    public List<XxlMqMessage> pageList(int offset, int pagesize, String name, String status);
    public int pageListCount(int offset, int pagesize, String name, String status);

    public int delete(int id);

    public int save(XxlMqMessage xxlMqMessage);

}
