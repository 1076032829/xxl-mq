package com.xxl.mq.client.rpc.netcom.netty.client;

import com.xxl.mq.client.rpc.netcom.common.codec.RpcRequest;
import com.xxl.mq.client.rpc.netcom.common.codec.RpcResponse;
import com.xxl.mq.client.rpc.netcom.netty.codec.NettyDecoder;
import com.xxl.mq.client.rpc.netcom.netty.codec.NettyEncoder;
import io.netty.bootstrap.Bootstrap;
import io.netty.channel.Channel;
import io.netty.channel.ChannelInitializer;
import io.netty.channel.ChannelOption;
import io.netty.channel.EventLoopGroup;
import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.channel.socket.SocketChannel;
import io.netty.channel.socket.nio.NioSocketChannel;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * connetion proxy
 * @author xuxueli
 */
public class NettyClientPoolProxy {
	private static transient Logger logger = LoggerFactory.getLogger(NettyClientPoolProxy.class);
	
	private Channel channel;
	public void createProxy(String host, int port) throws InterruptedException {
		EventLoopGroup group = new NioEventLoopGroup();
    	Bootstrap bootstrap = new Bootstrap();
        bootstrap.group(group).channel(NioSocketChannel.class)
            .handler(new ChannelInitializer<SocketChannel>() {
                @Override
                public void initChannel(SocketChannel channel) throws Exception {
                    channel.pipeline()
                        .addLast(new NettyEncoder(RpcRequest.class))
                        .addLast(new NettyDecoder(RpcResponse.class))
                        .addLast(new NettyClientHandler());
                }
            })
            .option(ChannelOption.TCP_NODELAY, true)
			.option(ChannelOption.SO_REUSEADDR, true)
            .option(ChannelOption.SO_KEEPALIVE, true);
        this.channel = bootstrap.connect(host, port).sync().channel();
	}
	
	public Channel getChannel() {
		return this.channel;
	}
	
	public boolean isValidate() {
		if (this.channel != null) {
			return this.channel.isActive();
		}
		return false;
	}
	
	public void close() {
		if (this.channel != null) {
			if (this.channel.isOpen()) {
				this.channel.close();
			}
		}
		logger.info(">>>>>>>>> netty channel close.");
	}
	
	public void send(RpcRequest request) throws Exception {
    	this.channel.writeAndFlush(request).sync();
    }
}
