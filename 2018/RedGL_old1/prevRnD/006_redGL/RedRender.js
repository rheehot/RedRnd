"use strict";
var RedRender;
/**DOC:
    {
        constructorYn : true,
        title :`RedMeshInfo`,
        description : `
            <h2>렌더러이고..현재 구현중</h2>
            - <span style="color:red"><b>입력하지않으면 그냥 UUID를 생성해버릴까..</b></span>
        `,
        params : {
            redGL : [
                {type:'RedGL Instance'},
                '- redGL 인스턴스'
            ],
            redScene : [
                {type:'RedSceneInfo'},
                '- RedSceneInfo을 일단 최초 렌더 그룹으로 본다.',
                '- <span style="color:red"><b>월드는 어찌할지 고민중</b></span>'
            ],
            callback : [
                {type:'Function'},
                '- 루프시 사전에 돌릴 콜백등록',
                '- <span style="color:red"><b>이놈은 누중에 루프관리자가 먹겠군</b></span>'
            ]
        },
        example : `
            //TODO
        `,
        return : 'RedRender Instance'
    }
:DOC*/
(function () {
    var tDatas;
    var SIN, COS;
    SIN = Math.sin, COS = Math.cos
    RedRender = function (redGL, redScene, callback) {
        if (!(this instanceof RedRender)) return new RedRender(redGL, redScene, callback)
        if (!(redGL instanceof RedGL)) throw 'RedGL 인스턴스만 허용됩니다.'
        var self;
        self = this

        // 씬생성!!
        this['callback'] = callback
        this['targetScene'] = redScene
        this['__UUID'] = REDGL_UUID++
        this['numDrawCall'] = 0
        //
        var k; //루프변수
        var tScene; // 대상 RedScene
        var tMesh; // 대상 메쉬
        var tMVMatrix; // 대상 메쉬의 매트릭스 
        ///////////////////////////////////////////////////////////////////
        var a, aSx, aSy, aSz, aCx, aCy, aCz, tRx, tRy, tRz;
        var a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23, a30, a31, a32, a33;
        var b0, b1, b2, b3;
        var b00, b01, b02, b10, b11, b12, b20, b21, b22
        var aX, aY, aZ;
        ///////////////////////////////////////////////////////////////////
        var tGL; // 대상 RedGL의 gl context
        var tMeterial; // 대상 재질
        var tProgramInfo; // 대상 프로그램 정보
        var tProgram; // 대상 프로그램
        var tGeometry; // 대상 지오메트리
        var tAttrGroup; // 대상 버퍼정보그룹
        var tAttrGroupList; // 대상 버퍼정보그룹을 리스트화함
        var tAttrLocationGroup; // 대상 Attribute의 location 정보들
        var tAttrBufferInfo; // 대상 RedBufferInfo 
        var tAttrPointer; // 대상 Attrobute가 반영될 쉐이더내의 변수이름
        var tUniformGroup; // 대상 유니폼 그룹
        var tUniformGroupList; // 대상 유니폼 그룹을 리스트화함
        var tUniformLocationGroup; // 대상 프로그램의 uniform location 정보들
        var tUniformKey, tUniformValue; // 대상 유니폼 키와 값
        var tLocation; // 대상 location 정보
        var tIndicesBuffer; // 인덱스 버퍼
        var tVertexPositionBuffer; // 포지션 버퍼
        ///////////////////////////////////////////////////////////////////
        var cacheProgram; // 이전 대상 프로그램        
        var cacheAttrUUID; // 어트리뷰트 캐싱정보
        var cacheDrawBufferUUID; // draw버퍼 캐싱정보
        var cacheTexture1_UUID; //텍스쳐 캐싱정보
        var cacheTextureAtlas_UUID; // 텍스쳐 아틀라스 캐싱정보
        var cacheActiveTextureIndex;
    
        ///////////////////////////////////////////////////////////////////
        var pMatrix;
        var aspect;

        cacheAttrUUID = {}

        this.render = function (time) {
            //TODO: 재질 소팅을 도입해야곘음 -_-;;
            self['callback'] ? self['callback'](time) : 0
            self['numDrawCall'] = 0
            tGL = redGL.gl
            //////////////////////////////////////////////////////////////////
            // 프로그램마다.....pMatrix업데이트
            // TODO: 이부분은 리사이저이벤트로 날릴수 있을듯
            pMatrix = mat4.create()
            aspect = redGL.__canvas.clientWidth / redGL.__canvas.clientHeight;
            mat4.perspective(pMatrix, 45, aspect, 0.1, 1000.0);
            for (k in redGL['__datas']['RedProgramInfo']) {
                tLocation = redGL['__datas']['RedProgramInfo'][k]['uniforms']['uPMatrix']['location']
                tGL.useProgram(redGL['__datas']['RedProgramInfo'][k]['program'])
                tGL.uniformMatrix4fv(tLocation, false, pMatrix)
                cacheProgram = null // 캐쉬된 프로그램을 삭제
            }
            //////////////////////////////////////////////////////////////////
            //////////////////////////////////////////////////////////////////
            tGL.clear(tGL.COLOR_BUFFER_BIT | tGL.DEPTH_BUFFER_BIT);
            tScene = self['targetScene']
            self.draw(tScene['children'], time)
            requestAnimationFrame(self.render)
        }
        this.draw = function (renderList, time, parentMTX) {
            var i, i2; // 루프변수
            i = renderList.length
            while (i--) {
                self['numDrawCall']++
                tMesh = renderList[i]
                tMVMatrix = tMesh['uMVMatrix']
                // 매트릭스 초기화
                tMVMatrix[0] = 1, tMVMatrix[1] = 0, tMVMatrix[2] = 0, tMVMatrix[3] = 0,
                tMVMatrix[4] = 0, tMVMatrix[5] = 1, tMVMatrix[6] = 0, tMVMatrix[7] = 0,
                tMVMatrix[8] = 0, tMVMatrix[9] = 0, tMVMatrix[10] = 1, tMVMatrix[11] = 0,
                tMVMatrix[12] = 0, tMVMatrix[13] = 0, tMVMatrix[14] = 0, tMVMatrix[15] = 1
                // 기본 변환
                a = tMVMatrix
                // 이동
                aX = tMesh['position'][0], aY = tMesh['position'][1], aZ = tMesh['position'][2];
                a[12] = a[0] * aX + a[4] * aY + a[8] * aZ + a[12];
                a[13] = a[1] * aX + a[5] * aY + a[9] * aZ + a[13];
                a[14] = a[2] * aX + a[6] * aY + a[10] * aZ + a[14];
                a[15] = a[3] * aX + a[7] * aY + a[11] * aZ + a[15];
                // xyz축 회전 
                tRx = tMesh['rotation'][0], tRy = tMesh['rotation'][1], tRz = tMesh['rotation'][2]
                aSx = SIN(tRx), aCx = COS(tRx), aSy = SIN(tRy), aCy = COS(tRy), aSz = SIN(tRz), aCz = COS(tRz),
                    a00 = a[0], a01 = a[1], a02 = a[2],
                    a10 = a[4], a11 = a[5], a12 = a[6],
                    a20 = a[8], a21 = a[9], a22 = a[10],
                    b00 = aCy * aCz, b01 = aSx * aSy * aCz - aCx * aSz, b02 = aCx * aSy * aCz + aSx * aSz,
                    b10 = aCy * aSz, b11 = aSx * aSy * aSz + aCx * aCz, b12 = aCx * aSy * aSz - aSx * aCz,
                    b20 = -aSy, b21 = aSx * aCy, b22 = aCx * aCy,
                    a[0] = a00 * b00 + a10 * b01 + a20 * b02, a[1] = a01 * b00 + a11 * b01 + a21 * b02, a[2] = a02 * b00 + a12 * b01 + a22 * b02,
                    a[4] = a00 * b10 + a10 * b11 + a20 * b12, a[5] = a01 * b10 + a11 * b11 + a21 * b12, a[6] = a02 * b10 + a12 * b11 + a22 * b12,
                    a[8] = a00 * b20 + a10 * b21 + a20 * b22, a[9] = a01 * b20 + a11 * b21 + a21 * b22, a[10] = a02 * b20 + a12 * b21 + a22 * b22;
                // 스케일
                aX = tMesh['scale'][0], aY = tMesh['scale'][1], aZ = tMesh['scale'][2]
                a[0] = a[0] * aX, a[1] = a[1] * aX, a[2] = a[2] * aX, a[3] = a[3] * aX;
                a[4] = a[4] * aY, a[5] = a[5] * aY, a[6] = a[6] * aY, a[7] = a[7] * aY,
                    a[8] = a[8] * aZ, a[9] = a[9] * aZ, a[10] = a[10] * aZ, a[11] = a[11] * aZ,
                    a[12] = a[12], a[13] = a[13], a[14] = a[14], a[15] = a[15]
                // 부모가있으면 곱함
                if (parentMTX) {
                    // 부모매트릭스 복사
                    var parentClone = new glMatrix.ARRAY_TYPE(16);
                    parentClone[0] = parentMTX[0], parentClone[1] = parentMTX[1], parentClone[2] = parentMTX[2], parentClone[3] = parentMTX[3],
                    parentClone[4] = parentMTX[4], parentClone[5] = parentMTX[5], parentClone[6] = parentMTX[6], parentClone[7] = parentMTX[7],
                    parentClone[8] = parentMTX[8], parentClone[9] = parentMTX[9], parentClone[10] = parentMTX[10], parentClone[11] = parentMTX[11],
                    parentClone[12] = parentMTX[12], parentClone[13] = parentMTX[13], parentClone[14] = parentMTX[14], parentClone[15] = parentMTX[15]
                    /////////////////////////////////////////////////////////////////////////////////////////////
                    // 매트립스 곱
                    a00 = parentClone[0], a01 = parentClone[1], a02 = parentClone[2], a03 = parentClone[3],
                    a10 = parentClone[4], a11 = parentClone[5], a12 = parentClone[6], a13 = parentClone[7],
                    a20 = parentClone[8], a21 = parentClone[9], a22 = parentClone[10], a23 = parentClone[11],
                    a30 = parentClone[12], a31 = parentClone[13], a32 = parentClone[14], a33 = parentClone[15],
                    // Cache only the current line of the second matrix
                    b0 = tMVMatrix[0], b1 = tMVMatrix[1], b2 = tMVMatrix[2], b3 = tMVMatrix[3],
                    tMVMatrix[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30,
                    tMVMatrix[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31,
                    tMVMatrix[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32,
                    tMVMatrix[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33,
                    b0 = tMVMatrix[4], b1 = tMVMatrix[5], b2 = tMVMatrix[6], b3 = tMVMatrix[7],
                    tMVMatrix[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30,
                    tMVMatrix[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31,
                    tMVMatrix[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32,
                    tMVMatrix[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33,
                    b0 = tMVMatrix[8], b1 = tMVMatrix[9], b2 = tMVMatrix[10], b3 = tMVMatrix[11],
                    tMVMatrix[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30,
                    tMVMatrix[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31,
                    tMVMatrix[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32,
                    tMVMatrix[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33,
                    b0 = tMVMatrix[12], b1 = tMVMatrix[13], b2 = tMVMatrix[14], b3 = tMVMatrix[15],
                    tMVMatrix[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30,
                    tMVMatrix[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31,
                    tMVMatrix[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32,
                    tMVMatrix[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33
                    /////////////////////////////////////////////////////////////////////////////////////////////
                }
                // 정보세팅
                tMeterial = tMesh['materialInfo']
                tProgramInfo = tMeterial['programInfo']
                tProgram = tProgramInfo['program']
                tGeometry = tMesh['geometryInfo']
                tAttrGroup = tGeometry['attributes']
                tAttrGroupList = tGeometry['__attributeList']
                tAttrLocationGroup = tProgramInfo['attributes']
                tUniformGroup = tMeterial['uniforms']
                tUniformLocationGroup = tProgramInfo['uniforms']
                tIndicesBuffer = tGeometry['indices']
                tVertexPositionBuffer = tAttrGroup['vertexPosition']

                // 프로그램 세팅 & 캐싱
                cacheProgram != tProgram ? tGL.useProgram(tProgram) : 0
                cacheProgram = tProgram
                // 어트리뷰트 입력
                i2 = tAttrGroupList.length
                while (i2--) {
                    tAttrBufferInfo = tAttrGroupList[i2], // 대상버퍼구하고
                        tAttrPointer = tAttrBufferInfo['shaderPointerKey'] // 바인딩할 쉐이더 변수키를 알아낸다.
                    // console.log(tProgramInfo['key'],tAttrPointer)
                    if (tAttrLocationGroup[tAttrPointer]) { // 정보매칭이 안되는 녀석은 무시한다 
                        tLocation = tAttrLocationGroup[tAttrPointer]['location'] // 로케이션도 알아낸다.
                        // 캐싱된 attribute정보과 현재 대상정보가 같다면 무시
                        cacheAttrUUID[tLocation] == tAttrBufferInfo['__UUID']
                            ? 0
                            : (
                                tGL.bindBuffer(tGL.ARRAY_BUFFER, tAttrBufferInfo['buffer']), // 실제 버퍼 바인딩하고
                                tAttrBufferInfo['enabled'] ? 0 : (tGL.enableVertexAttribArray(tLocation), tAttrBufferInfo['enabled'] = 1), // 해당로케이션을 활성화 시킨다
                                // console.log(tAttrBufferInfo),
                                tGL.vertexAttribPointer(
                                    tLocation,
                                    tAttrBufferInfo['pointSize'],
                                    tAttrBufferInfo['arrayType'],
                                    tAttrBufferInfo['normalize'],
                                    tAttrBufferInfo['stride'],
                                    tAttrBufferInfo['offset']
                                ),
                                cacheAttrUUID[tLocation] = tAttrBufferInfo['__UUID'] // 상태 캐싱
                                // ,console.log('한번만되는지확인')
                            )
                    }
                }
                // 재질이 처음만들어진경우 유니폼맵을 기반으로 유니폼 렌더리스트로 만든다. 
                if (tMeterial['needUniformList']) {
                    tMeterial['__uniformList'] = []
                    for (k in tUniformGroup) {
                        tMeterial['__uniformList'].push(
                            {
                                key: k,
                                value: tUniformGroup[k],
                                location: tUniformLocationGroup[k]['location']
                            }
                        )
                    }
                    tMeterial['needUniformList'] = false
                }
                // 유니폼 입력
                tUniformGroupList = tMeterial['__uniformList']
                i2 = tUniformGroupList.length
                var bitmapRenderable = true
                while (i2--) {
                    tUniformKey = tUniformGroupList[i2]['key']
                    tUniformValue = tUniformGroupList[i2]['value']
                    tLocation = tUniformGroupList[i2]['location']
                    if (tUniformValue['__uniformMethod']) {
                        tUniformValue['__isMatrix'] // 매트릭스형태인지 아닌지 파악
                            ? tGL[tUniformValue['__uniformMethod']](tLocation, false, tUniformGroup[tUniformKey])
                            : tGL[tUniformValue['__uniformMethod']](tLocation, tUniformGroup[tUniformKey])
                    }
                    else if (tUniformValue['__webglAtlasTexture']) {
                        var tTexture;
                        tTexture = tUniformValue['targetAtlasInfo']['textureInfo']
                        //TODO: 여길또 인덱스 기반으로 바꿔야하는구만...
                        if(cacheTextureAtlas_UUID ==undefined) bitmapRenderable = false
                        if (tTexture['loaded']) {
                            if (cacheTextureAtlas_UUID != tTexture['__UUID']) {
                                tTexture['actived'] ? 0 : tGL.activeTexture(tGL.TEXTURE0 + tTexture['__targetIndex'])
                                tTexture['actived'] = 1
                                tGL.activeTexture(tGL.TEXTURE0 + tTexture['__targetIndex'])
                                tGL.bindTexture(tGL.TEXTURE_2D, tTexture['texture'])
                                cacheTextureAtlas_UUID = tTexture['__UUID']
                            }
                            if(cacheActiveTextureIndex!=tTexture['__targetIndex']) tGL.uniform1i(tLocation, tTexture['__targetIndex'])
                            cacheActiveTextureIndex = tTexture['__targetIndex']
                        }
                        
                    }
                    else if (tUniformValue['__webglTexture']) {
                        if (cacheTexture1_UUID == undefined) bitmapRenderable = false
                        if (tUniformValue['loaded']) {
                            if (cacheTexture1_UUID != tUniformValue['__UUID']) {
                                tUniformValue['actived'] ? 0 : tGL.activeTexture(tGL.TEXTURE0 + tUniformValue['__targetIndex'])
                                tUniformValue['actived'] = 1
                                tGL.activeTexture(tGL.TEXTURE0 + tUniformValue['__targetIndex'])
                                tGL.bindTexture(tGL.TEXTURE_2D, tUniformValue['texture'])
                                cacheTexture1_UUID = tUniformValue['__UUID']
                            }
                            if(cacheActiveTextureIndex!=tUniformValue['__targetIndex']) tGL.uniform1i(tLocation, tUniformValue['__targetIndex'])
                            cacheActiveTextureIndex = tUniformValue['__targetIndex']
                        }
                    }
                    else throw '안되는 나쁜 타입인거야!!'
                }
                // uMVMatrix 입력 //TODO: 이것도 자동으로 하고싶은데...
                tGL.uniformMatrix4fv(tUniformLocationGroup['uMVMatrix']['location'], false, tMVMatrix)
                if (tIndicesBuffer) {
                    if (bitmapRenderable) {
                        cacheDrawBufferUUID == tIndicesBuffer['__UUID'] ? 0 : tGL.bindBuffer(tGL.ELEMENT_ARRAY_BUFFER, tIndicesBuffer['buffer'])
                        tGL.drawElements(tMesh['drawMode'], tIndicesBuffer['pointNum'], tGL.UNSIGNED_SHORT, 0)
                        cacheDrawBufferUUID = tIndicesBuffer['__UUID']
                    }
                } else {
                    tGL.drawArrays(tMesh['drawMode'], 0, tVertexPositionBuffer['pointNum'])
                    cacheDrawBufferUUID = tVertexPositionBuffer['__UUID']
                }
                // 자식을 콜
                if (tMesh['children'].length) self.draw(tMesh['children'], time, tMVMatrix)
            }
        }
    }
    RedRender.prototype = {
        start: function () {
            requestAnimationFrame(this.render)
        }
    }
    Object.freeze(RedRender)
})();