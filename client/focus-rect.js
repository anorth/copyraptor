module.import(copyraptor.util);

copyraptor.FocusRect = FocusRect;
function FocusRect() {
  var me = this;

  var thickness = me.thickness = 24;
  var offset = me.offset = 0;

  var color = rgba(0, 0, 0, 0.5);

  me.elem = divc('focus-rect',
      absolute({
        height: 0,
        width: 0
      }),


      me.left = divc('left focus-rect-segment',
        absolute({
          top: px(-2*offset - 0.5*thickness),
          right: px(offset),
          width: px(thickness)
        })
      ),
    
      me.right = divc('right focus-rect-segment',
        absolute({
          top: px(-2*offset - 0.5*thickness),
          width: px(thickness)
        })
      ),

      me.top = divc('top focus-rect-segment',
        absolute({
          bottom: px(offset),
          left: px(-0.5*thickness - 2*offset),
          height: px(thickness)
        })
      ),

      me.bottom = divc('bottom focus-rect-segment',
        absolute({
          left: px(-0.5*thickness - 2*offset),
          height: px(thickness)
        })
      )
    );

  me.hide();
}

FocusRect.prototype.hide = function() {
  var me = this;
  me.elem.style.display = 'none';
  me.wrapped = null;
};

FocusRect.prototype.wrap = function(elem)  {
  var me = this;

  me.wrapped = elem;

  var rect = elem.getBoundingClientRect();

  me.move(rect.left, rect.top, rect.width, rect.height);
};

FocusRect.prototype.move = function(x, y, width, height) {
  var me = this;
  me.elem.style.display = '';

  me.elem.style.left = px(x - 2);
  me.elem.style.top = px(y - 2);

  me.left.style.height = px(height + 2*me.thickness +1);

  me.right.style.height = px(height + 2 * me.thickness +1);
  me.right.style.left = px(width);

  me.top.style.width = px(width + 2 * me.thickness +1);

  me.bottom.style.width = px(width + 2 * me.thickness);
  me.bottom.style.top = px(height + me.offset);

};

