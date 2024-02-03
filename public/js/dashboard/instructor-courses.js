

(function($) {
    /* "use strict" */
	
 var dlabChartlist = function(){
	 
	var screenWidth = $(window).width();
	
	var donutChart1 = function(){
		$("span.donut1").peity("donut", {
			width: "50",
			height: "50"
		});
	}
	
	var sellingActivity = function(){
		var options = {
			  series: [{
				name: '',	
			  data: [44, 55, 41, 64,]
			}, {
				name: '',	
			  data: [53, 32, 33, 52]
			}],
			  chart: {
			  type: 'bar',
			  height: 350,
			   toolbar: {
				    show: false,
			   }
			},
			plotOptions: {
			  bar: {
				horizontal: true,
				barHeight : '40%',
				dataLabels: {
				  position: 'top',
				},
			  }
			},
			dataLabels: {
			  enabled: false,
			  offsetX: -6,
			  style: {
				fontSize: '12px',
				colors: ['#fff']
			  }
			},
			stroke: {
			  show: true,
			  width: 0,
			  colors: ['#fff']
			},
			tooltip: {
			  y: {
				formatter: function (val) {
				  return "$ " + val
				}
			  }
			},
			fill: {
				colors:['var(--secondary)','#FEC64F'],
			},
			grid: {
				strokeDashArray: 5,	
				xaxis: {
					lines: {
						show: true
					}
				},  
				yaxis: {
					lines: {
						show: false
					}
				},  				
			},
			legend: {
				 show: false,
			},
			xaxis: {
				position: 'bottom',	
				categories: ['w1', 'w2', 'w3', 'w4'],
				labels: {
					style: {
						colors: '#828282',
						fontSize: '14px',
						fontFamily: 'Poppins',
						fontWeight: 'light',
						cssClass: 'apexcharts-xaxis-label',
					},
				},
			},
			yaxis:{
				labels: {
					style: {
						colors: '#828282',
						fontSize: '14px',
						fontFamily: 'Poppins',
						fontWeight: 'light',
						cssClass: 'apexcharts-xaxis-label',
					},
				},
			}
		};
		
		if(jQuery("#sellingActivity").length > 0){
			
			var chart = new ApexCharts(document.querySelector("#sellingActivity"), options);
			chart.render();
			
		}
	}
	
	var sellingActivity2 = function(){
		var options = {
			  series: [{
				name: '',	
			  data: [44, 55, 41, 64,]
			}, {
				name: '',	
			  data: [53, 32, 33, 52]
			}],
			  chart: {
			  type: 'bar',
			  height: 350,
			   toolbar: {
				    show: false,
			   }
			},
			plotOptions: {
			  bar: {
				horizontal: true,
				barHeight : '40%',
				dataLabels: {
				  position: 'top',
				},
			  }
			},
			dataLabels: {
			  enabled: false,
			  offsetX: -6,
			  style: {
				fontSize: '12px',
				colors: ['#fff']
			  }
			},
			stroke: {
			  show: true,
			  width: 0,
			  colors: ['#fff']
			},
			tooltip: {
			  y: {
				formatter: function (val) {
				  return "$ " + val
				}
			  }
			},
			fill: {
				colors:['var(--secondary)','#FEC64F'],
			},
			grid: {
				strokeDashArray: 5,	
				xaxis: {
					lines: {
						show: true
					}
				},  
				yaxis: {
					lines: {
						show: false
					}
				},  				
			},
			legend: {
				 show: false,
			},
			xaxis: {
				position: 'bottom',	
				categories: ['w1', 'w2', 'w3', 'w4'],
				labels: {
					style: {
						colors: '#828282',
						fontSize: '14px',
						fontFamily: 'Poppins',
						fontWeight: 'light',
						cssClass: 'apexcharts-xaxis-label',
					},
				},
			},
			yaxis:{
				labels: {
					style: {
						colors: '#828282',
						fontSize: '14px',
						fontFamily: 'Poppins',
						fontWeight: 'light',
						cssClass: 'apexcharts-xaxis-label',
					},
				},
			}
		};
		
		if(jQuery("#sellingActivity2").length > 0){
			
			var chart = new ApexCharts(document.querySelector("#sellingActivity2"), options);
			chart.render();
			
		}
	}
	 var emailchart = function() {
		var options = {
			series: [27, 23, 50],
			chart: {
				type: 'donut',
				height: 250
			},
			dataLabels: {
				enabled: true,
				formatter: function (val, opts) {
					  return val+'%'
				  },
				style: {
					fontSize: '12px',
					colors: ['#fff'],
					
				},
				dropShadow: {
				  enabled: false,
				}
			},
			stroke: {
				width: 0,
			},
			colors: ['var(--primary)', '#4CBC9A', '#FEC64F'],
			legend: {
				position: 'bottom',
				show: false
			},
			responsive: [{
				breakpoint: 1800,
				options: {
					chart: {
						height: 200
					},
				}
			}, {
				breakpoint: 1800,
				options: {
					chart: {
						height: 200
					},
				}
			}]
		};
		var chart = new ApexCharts(document.querySelector("#emailchart"), options);
		chart.render();
	}
	var design = function(){
		var options = {
			  series: [{
			  data: [44, 55, 41]
			}, {
			  data: [53, 32, 33]
			}],
			  chart: {
			  type: 'bar',
			  height: 150,
			   toolbar: {
				    show: false,
			   }
			},
			plotOptions: {
			  bar: {
				horizontal: false,
				dataLabels: {
				  position: 'top',
				},
			  }
			},
			dataLabels: {
			  enabled: false,
			  offsetX: -1,
			  style: {
				fontSize: '12px',
				colors: ['#fff']
			  }
			},
			stroke: {
			  show: true,
			  width: 12,
			  colors: ['#fff']
			},
			tooltip: {
			  shared: true,
			  intersect: false
			},
			fill: {
				colors:['#ff6a59','#4cbc9a'],
			},
			grid: {
				show: false,	
				strokeDashArray: 5,	
				xaxis: {
					lines: {
						show: false
					}
				},  
				yaxis: {
					lines: {
						show: false
					}
				},  				
			},
			legend: {
				 show: false,
			},
			yaxis: {
				show: false,
			},
			xaxis: {
			  categories: [0, 50, 75, 100, 125, 150, 175,200,250,250,275],
			   labels: {
				    show: false,
			   },
			   axisBorder: {
				    show: false,
			   },
			   axisTicks: {
				   show: false, 
			   },
			},
		};
		
		if(jQuery("#design").length > 0){
			
			var chart = new ApexCharts(document.querySelector("#design"), options);
			chart.render();
			
		}
	}
 
	/* Function ============ */
	return {
		init:function(){
		},
		
		
		load:function(){
			donutChart1();
			sellingActivity();
			sellingActivity2();
			emailchart();
			design();
		},
		
		resize:function(){
		}
	}

}();

jQuery(window).on('load',function(){
	setTimeout(function(){
		dlabChartlist.load();
	}, 1000); 
	
});

})(jQuery);