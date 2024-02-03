

(function($) {
    /* "use strict" */
	
 var dlabChartlist = function(){
	
	var screenWidth = $(window).width();
	
	
	var donutChart1 = function(){
		$("span.donut1").peity("donut", {
			width: "100",
			height: "100"
		});
	}
	
	var activity = function(){
		var optionsArea = {
          series: [{
            name: "",
            data: [40, 55, 50, 40, 75, 80, 90]
          },
		  {
            name: "",
            data: [75, 25, 60, 25, 15, 70, 60]
          }
        ],
          chart: {
          height: 300,
          type: 'area',
		  group: 'social',
		  toolbar: {
            show: false
          },
          zoom: {
            enabled: false
          },
        },
        dataLabels: {
          enabled: false
        },
        stroke: {
          width: [3, 3, 3],
		  colors:['#4CBC9A','#FF6A59'],
		  curve: 'straight'
        },
        legend: {
			show:false,
          tooltipHoverFormatter: function(val, opts) {
            return val + ' - ' + opts.w.globals.series[opts.seriesIndex][opts.dataPointIndex] + ''
          },
		  markers: {
			fillColors:['#C046D3','#FF6A59','#FF9432'],
			width: 16,
			height: 16,
			strokeWidth: 0,
			radius: 16
		  }
        },
    
        xaxis: {
          categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
		  labels: {
		   style: {
			  colors: '#3E4954',
			  fontSize: '14px',
			   fontFamily: 'Poppins',
			  fontWeight: 100,
			  
			},
		  },
		  axisBorder:{
			  show: true,
		  }
        },
		yaxis: {
			labels: {
			offsetX:-16,
			minWidth:40,
			style: {
			  colors: '#3E4954',
			  fontSize: '14px',
			   fontFamily: 'Poppins',
			  fontWeight: 100,
			  
			},
		  },
		},
		fill: {
			colors:['#fff','#FF9432'],
			type:'gradient',
			opacity: 1,
			gradient: {
				shade:'light',
				shadeIntensity: 1,
				colorStops: [ 
				  [
					{
					  offset: 0,
					  color: '#4CBC9A',
					  opacity: .4
					},
					{
					  offset: 0.6,
					  color: '#4CBC9A',
					  opacity: .4
					},
					{
					   offset: 100,
					  color: '#fff',
					  opacity: 0.4
					}
				  ],
				  [
					{
					  offset: 0,
					  color: '#FEC64F',
					  opacity: .28
					},
					{
					  offset: 50,
					  color: '#FEC64F',
					  opacity: 0.25
					},
					{
					  offset: 100,
					  color: '#fff',
					  opacity: 0.4
					}
				  ]
				]

		  },
		},
		colors:['#1EA7C5','#FF9432'],
        grid: {
          borderColor: '#f1f1f1',
		  xaxis: {
            lines: {
              show: true
            }
          },
		  yaxis: {
            lines: {
              show: true
            }
          },
        },
		 responsive: [{
			breakpoint: 575,
			options: {
				markers: {
					 size: [6,6,4],
					 hover: {
						size: 7,
					  }
				}
			}
		 }]
        };
		var chartArea = new ApexCharts(document.querySelector("#activity"), optionsArea);
        chartArea.render();

	}

	
 
	/* Function ============ */
		return {
			init:function(){
			},
			
			
			load:function(){
				donutChart1();
				activity();
				
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