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
				obj.name = $('#name').val();
				return obj;
            }
	    },
	    "searching": false,
	    "ordering": false,
	    //"scrollX": true,	// X轴滚动条，取消自适应
	    "columns": [
	                { data: 'id', visible: false},
					{ data: 'name'},
					{ data: 'data'},
					{
						data: 'delayTime',
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
						data: 'msg',
						render : function ( data, type, row ) {
							var temp = '<a href="javascript:;" class="msg_log" msg="'+ data +'" >流转日志</a>';
							return temp;
						}
					},
	                { data: 'msg' ,
	                	"render": function ( data, type, row ) {
	                		return function(){
	                			var html = '<p id="'+ row.id +
										'" name="'+ row.name +
										'" delayTime="'+ row.delayTime +
										'">' +
										'<textarea name="data" style="display: none">'+row.data+'</textarea>' +
								  		'<button class="btn btn-danger btn-xs msg_remove" type="button">删除</button>  '+
										'<button class="btn btn-info btn-xs msg_update" type="button">编辑</button>  '+
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
			"sInfo" : "第 _PAGE_ 页 ( 总共 _PAGES_ 页 )",
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

	// msg弹框
	$("#data_list").on('click', '.msg_log',function() {
		ComAlertTec.show($(this).attr('msg'));
	});


	// 搜索按钮
	$('#searchBtn').on('click', function(){
		dataTable.fnDraw();
	});
	
	// msg_remove
	$("#data_list").on('click', '.msg_remove',function() {

		var id = $(this).parent('p').attr("id");
		ComConfirm.show("确认删除该消息?", function(){
			$.ajax({
				type : 'POST',
				url : base_url + "/mq/delete",
				data : {
					"id"  : id
				},
				dataType : "json",
				success : function(data){
					if (data.code == 200) {
						ComAlert.show(1, "消息删除成功", function(){
							//window.location.reload();
							dataTable.fnDraw();
						});
					} else {
						ComAlert.show(2, "消息删除失败");
					}
				},
			});
		});
	});

	// 时间格式化
	$("[data-mask]").inputmask({
		mask: "y-m-d h:s:s",
		placeholder: "yyyy-mm-dd hh:mm:ss",
		hourFormat: "24"
	});

	// msg_update
	$("#data_list").on('click', '.msg_update',function() {
		var delayTime = moment(new Date(Number( $(this).parent('p').attr("delayTime") ))).format("YYYY-MM-DD HH:mm:ss");

		$("#updateModal .form input[name='name']").val( $(this).parent('p').attr("name") );
		//$("#updateModal .form input[name='delayTime']").val(delayTime);
		$("#updateModal .form textarea[name='data']").val( $(this).parent('p').find("textarea[name='data']").val() );

		$('#updateModal').modal({backdrop: false, keyboard: false}).modal('show');
	});
	var updateModalValidate = $("#updateModal .form").validate({
		errorElement : 'span',
		errorClass : 'help-block',
		focusInvalid : true,
		rules : {
			nodeKey : {
				required : true ,
				minlength: 4,
				maxlength: 100
			},
			nodeValue : {
				required : false
			},
			nodeDesc : {
				required : false
			}
		},
		messages : {
			nodeKey : {
				required :'请输入"KEY".'  ,
				minlength:'"KEY"不应低于4位',
				maxlength:'"KEY"不应超过100位'
			},
			nodeValue : {	},
			nodeDesc : {	}
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
			$.post(base_url + "/conf/update", $("#updateModal .form").serialize(), function(data, status) {
				if (data.code == "200") {
					ComAlert.show(1, "更新配置成功", function(){
						confTable.fnDraw();
						$('#updateModal').modal('hide');
					});
				} else {
					ComAlert.show(2, data.msg);
				}
			});
		}
	});
	$("#updateModal").on('hide.bs.modal', function () {
		$("#updateModal .form")[0].reset()
	});
	
});
