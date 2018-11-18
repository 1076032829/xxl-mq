$(function() {

	// init date tables
	var dataTable = $("#data_list").dataTable({
		"deferRender": true,
		"processing" : true, 
	    "serverSide": true,
		"ajax": {
			url: base_url + "/mq/pageList",
	        data : function ( d ) {
				var obj = {};
				obj.start = d.start;
				obj.length = d.length;
				obj.topic = $('#topic').val();
				obj.status = $('#status').val();
				return obj;
            }
	    },
	    "searching": false,
	    "ordering": false,
	    //"scrollX": true,	// X轴滚动条，取消自适应
	    "columns": [
	                { data: 'id', visible: true},
					{ data: 'name'},
					{
						data: 'data',
						render : function ( data, type, row ) {
							if (data) {
								return '<a href="javascript:;" class="showData" _id="'+ row.id +'" >查看<span style="display: none;">'+ data +'</span></spam></a>';
							} else {
								return '空';
							}
						}
					},
					{
						data: 'effectTime',
						render : function ( data, type, row ) {
							return data?moment(new Date(data)).format("YYYY-MM-DD HH:mm:ss"):"";
						}
					},
					{
						data: 'addTime',
						render : function ( data, type, row ) {
							var temp = data?moment(new Date(data)).format("YYYY-MM-DD HH:mm:ss"):"";
							temp += "<br>";
							temp += data?moment(new Date(row.updateTime)).format("YYYY-MM-DD HH:mm:ss"):"";
							return temp;
						}
					},
					//{ data: 'updateTime'},
					{ data: 'status'},
					{
						data: 'log',
						render : function ( data, type, row ) {
							if (data) {
								return '<a href="javascript:;" class="showLog" _id="'+ row.id +'">查看</spam></a>';
							} else {
								return '空';
							}
						}
					},
					{ data: 'retryCount'},
	                { data: 'msg' ,
	                	"render": function ( data, type, row ) {
	                		return function(){

	                			// data
                                tableData['key'+row.id] = row;

                                // opt
	                			var html = '<p id="'+ row.id +'" >'+
										'<button class="btn btn-info btn-xs msg_update" type="button">编辑</button>  '+
										'<button class="btn btn-danger btn-xs msg_remove" type="button">删除</button>  '+
								  		'</p>';
	                			return html;
	                		};
	                	}
	                }
	            ],
		"language" : {
			"sProcessing" : "处理中...",
			"sLengthMenu" : "每页 _MENU_ 条记录",
			"sZeroRecords" : "没有匹配结果",
			"sInfo" : "第 _PAGE_ 页 ( 总共 _PAGES_ 页 ) 总记录数 _MAX_ ",
			"sInfoEmpty" : "无记录",
			"sInfoFiltered" : "(由 _MAX_ 项结果过滤)",
			"sInfoPostFix" : "",
			"sSearch" : "搜索:",
			"sUrl" : "",
			"sEmptyTable" : "表中数据为空",
			"sLoadingRecords" : "载入中...",
			"sInfoThousands" : ",",
			"oPaginate" : {
				"sFirst" : "首页",
				"sPrevious" : "上页",
				"sNext" : "下页",
				"sLast" : "末页"
			},
			"oAria" : {
				"sSortAscending" : ": 以升序排列此列",
				"sSortDescending" : ": 以降序排列此列"
			}
		}
	});

    // table data
    var tableData = {};

	// msg 弹框
	$("#data_list").on('click', '.showData',function() {
		var _id = $(this).attr('_id');
		var row = tableData['key' + _id ];
        ComAlertTec.show(row.data);
	});
    $("#data_list").on('click', '.showLog',function() {
        var _id = $(this).attr('_id');
        var row = tableData['key' + _id ];
        ComAlertTec.show(row.log);
    });

    // search btn
	$('#searchBtn').on('click', function(){
		dataTable.fnDraw();
	});
	
	// msg_remove
	$("#data_list").on('click', '.msg_remove',function() {

		var id = $(this).parent('p').attr("id");

        layer.confirm( "确认删除该消息?", {
            icon: 3,
            title: "系统提示" ,
            btn: [ "确认", "取消" ]
        }, function(index){
            layer.close(index);

            $.ajax({
                type : 'POST',
                url : base_url + "/mq/delete",
                data : {
                    "id"  : id
                },
                dataType : "json",
                success : function(data){
                    if (data.code == 200) {

                        layer.open({
                            title: "系统提示",
                            btn: [ "确认" ],
                            content: "消息删除成功" ,
                            icon: '1',
                            end: function(layero, index){
                                dataTable.fnDraw(false);
                            }
                        });
                    } else {
                        layer.open({
                            title: "系统提示",
                            btn: [ "确认" ],
                            content: (data.msg || "消息删除失败" ),
                            icon: '2'
                        });
                    }
                }
            });
        });

	});

	// msg_add
	$('#msg_add').on('click', function(){
		$("#addModal .form input[name='effectTime']").val( moment(new Date()).format("YYYY-MM-DD HH:mm:ss") );
		$('#addModal').modal({backdrop: false, keyboard: false}).modal('show');
	});
	var addModalValidate = $("#addModal .form").validate({
		errorElement : 'span',
		errorClass : 'help-block',
		focusInvalid : true,
		rules : {
			name : {
				required : true ,
				minlength: 10,
				maxlength: 250
			},
			retryCount : {
				required:true,
				digits : true
			}
		},
		messages : {
			name : {
				required :'请输入"消息主题".'  ,
				minlength:'"消息主题"不应低于4位',
				maxlength:'"消息主题"不应超过250位'
			},
			retryCount : {
				required:"请输入重试次数",
				digits :'请输入"正整数".'
			}
		},
		highlight : function(element) {
			$(element).closest('.form-group').addClass('has-error');
		},
		success : function(label) {
			label.closest('.form-group').removeClass('has-error');
			label.remove();
		},
		errorPlacement : function(error, element) {
			element.parent('div').append(error);
		},
		submitHandler : function(form) {
			$.post(base_url + "/mq/add", $("#addModal .form").serialize(), function(data, status) {
				if (data.code == "200") {
					$('#addModal').modal('hide');

                    layer.open({
                        title: "系统提示",
                        btn: [ "确认" ],
                        content: "新增成功" ,
                        icon: '1',
                        end: function(layero, index){
                            dataTable.fnDraw(false);
                        }
                    });
				} else {
                    layer.open({
                        title: "系统提示",
                        btn: [ "确认" ],
                        content: (data.msg || "操作失败" ),
                        icon: '2'
                    });
				}
			});
		}
	});
	$("#addModal").on('hide.bs.modal', function () {
		$("#addModal .form")[0].reset();
	});


	// 时间格式化
	$("[data-mask]").inputmask({
		mask: "y-m-d h:s:s",
		placeholder: "yyyy-mm-dd hh:mm:ss",
		hourFormat: "24"
	});

	// msg_update
	$("#data_list").on('click', '.msg_update',function() {
		var id = $(this).parent('p').attr("id");
        var row = tableData['key' + _id ];

		$("#updateModal .form input[name='id']").val( id );
		$("#updateModal .form textarea[name='data']").val( row.data );
		$("#updateModal .form input[name='effectTime']").val( moment(new Date(Number( row.effectTime ))).format("YYYY-MM-DD HH:mm:ss") );
		$("#updateModal .form select[name='status']").find("option[value='" + row.status + "']").prop("selected",true);
		$("#updateModal .form input[name='retryCount']").val( row.retryCount );

		$('#updateModal').modal({backdrop: false, keyboard: false}).modal('show');
	});
	var updateModalValidate = $("#updateModal .form").validate({
		errorElement : 'span',
		errorClass : 'help-block',
		focusInvalid : true,
		rules : {
			retryCount : {
				required:true,
				digits : true
			}
		},
		messages : {
			retryCount : {
				required:"请输入重试次数",
				digits :'请输入"正整数".'
			}
		},
		highlight : function(element) {
			$(element).closest('.form-group').addClass('has-error');
		},
		success : function(label) {
			label.closest('.form-group').removeClass('has-error');
			label.remove();
		},
		errorPlacement : function(error, element) {
			element.parent('div').append(error);
		},
		submitHandler : function(form) {
			$.post(base_url + "/mq/update", $("#updateModal .form").serialize(), function(data, status) {
				if (data.code == "200") {
					$('#updateModal').modal('hide');

                    layer.open({
                        title: "系统提示",
                        btn: [ "确认" ],
                        content: "更新成功" ,
                        icon: '1',
                        end: function(layero, index){
                            dataTable.fnDraw(false);
                        }
                    });
				} else {
                    layer.open({
                        title: "系统提示",
                        btn: [ "确认" ],
                        content: (data.msg || "操作失败" ),
                        icon: '2'
                    });
				}
			});
		}
	});
	$("#updateModal").on('hide.bs.modal', function () {
		$("#updateModal .form")[0].reset();
	});
	
});


// Com Alert by Tec theme
var ComAlertTec = {
    html:function(){
        var html =
            '<div class="modal fade" id="ComAlertTec" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">' +
            '<div class="modal-dialog">' +
            '<div class="modal-content-tec">' +
            '<div class="modal-body"><div class="alert" style="color:#fff;"></div></div>' +
            '<div class="modal-footer">' +
            '<div class="text-center" >' +
            '<button type="button" class="btn btn-info ok" data-dismiss="modal" >确认</button>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '</div>';
        return html;
    },
    show:function(msg, callback){
        // dom init
        if ($('#ComAlertTec').length == 0){
            $('body').append(ComAlertTec.html());
        }

        // init com alert
        $('#ComAlertTec .alert').html(msg);
        $('#ComAlertTec').modal('show');

        $('#ComAlertTec .ok').click(function(){
            $('#ComAlertTec').modal('hide');
            if(typeof callback == 'function') {
                callback();
            }
        });
    }
};
