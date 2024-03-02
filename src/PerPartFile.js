import React, {useState} from "react";
import axiosInstance from "./axiosInstance";

export default function PerPartFile() {

    const byteSize = 10485760; // 10 MB
    // const byteSize = 20971520; // 20 MB

    const [parts, setParts] = useState([]);
    const [file, setFile] = useState();
    const [entityId, setEntityId] = useState();
    const [loading, setLoading] = useState(false);

    const uuidv4 = () => {
        return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
    };

    const paginate = (arr, size) => {
        return arr.reduce((acc, val, i) => {
            let idx = Math.floor(i / size);
            let page = acc[idx] || (acc[idx] = []);
            page.push(val);
            return acc
        }, []);
    };

    const formatBytes = (bytes, decimals = 2) => {
        if (!+bytes) {
            return '0 Bytes';
        }
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    };

    const setCurrentFile = (e) => {
        const [file] = e.target.files;
        setFile(file);
    };

    const makePart = () => {
        setLoading(true);
        const reader = new FileReader();
        reader.readAsArrayBuffer(file);
        reader.onload = () => {
            const arrayBuffer = reader.result;
            const bytes = new Uint8Array(arrayBuffer);
            setEntityId(uuidv4());
            setParts(paginate(Array.from(bytes), byteSize));
            setLoading(false);
        };
    };

    const combinePart = () => {
        const bytes = parts.flatMap(value => value);
        const blob = new Blob([new Uint8Array(bytes)], {type: file.type});
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = file.name;
        link.click();
    };

    const savePart = (name, part) => {
        const blob = new Blob([new Uint8Array(part)]);
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = name;
        link.click();
    };

    const saveAllPart = (parts) => {
        parts.forEach((v, i) => {
            const blob = new Blob([new Uint8Array(v)]);
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = `part_${i}.part`;
            link.click();
        });
        const blob = new Blob([JSON.stringify({
            entityId: entityId,
            originalFileName: file.name,
            type: file.type,
            size: file.size
        })], {type: 'text/plain'});
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = `key.txt`;
        link.click();
    };

    const uploadPart = (name, partIndex, part) => {
        const formData = new FormData();
        const blob = new Blob([new Uint8Array(part)]);
        formData.append("file", blob, name);
        axiosInstance.postForm('http://localhost:8090/api/crud/media/upload/part', {
            file: formData.get("file"),
            target: `/folder/${entityId}`,
            properties: JSON.stringify({
                entityId: entityId,
                originalFileName: file.name,
                type: file.type,
                size: file.size,
                partIndex: partIndex,
            })
        }).then((res) => {

        })
            .catch((err) => {
                console.error(err);
            })
            .finally(() => {
            });
    };

    return (
        <div className="flex flex-col items-center justify-center w-full min-h-screen gap-2 p-4">
            <form className="flex flex-col items-center justify-center w-full gap-2" encType={'multipart/form-data'}
                  onSubmit={uploadPart}>
                <input type={'file'} name={'filePart'}
                       onChange={setCurrentFile}
                />
                <button type={'button'} className={'bg-blue-400 text-white p-2 m-2 text-base rounded'} onClick={makePart}>Make Part</button>
                <div className={'relative border rounded-lg w-full min-h-32 p-2'}>
                    {loading ? <div className={'absolute left-0 top-0 p-4 w-full'}>
                        <div className={'flex justify-center'}>
                            <label>Loading</label>
                        </div>
                    </div> : <div className={'flex flex-col'}>
                        <label>Key : {entityId}</label>
                        <label>Original Filename : {file?.name}</label>
                        <label>Original Size : {formatBytes(file?.size)}</label>
                        {parts.map((v, i) => <div className={'grid grid-cols-4 gap-4 items-center'}>
                            <div>{`part_${i}.part`}</div>
                            <div>{formatBytes(v.length)}</div>
                            <div>
                                <button type={'button'}
                                        className={'bg-gray-400 text-white p-2 m-2 text-base rounded'}
                                        onClick={() => uploadPart(`part_${i}.part`, i, v)}>Upload
                                </button>
                                <button type={'button'}
                                        className={'bg-gray-400 text-white p-2 m-2 text-base rounded'}
                                        onClick={() => savePart(`part_${i}.part`, v)}>Save
                                </button>
                            </div>
                        </div>)}
                        <button type={'button'}
                                className={'bg-gray-400 text-white p-2 m-2 text-base rounded'}
                                onClick={() => saveAllPart(parts)}>Save All
                        </button>
                    </div>}
                </div>
                <button type={'button'} className={'bg-blue-400 text-white p-2 m-2 text-base rounded'} onClick={combinePart}>Combine Part</button>
            </form>
        </div>
    );
}
