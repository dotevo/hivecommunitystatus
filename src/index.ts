import { RpcClient } from 'jsonrpc-ts';


interface HiveService {
	'condenser_api.get_discussions_by_created': {
		tag: string;
		limit: number;
		start_author: string | undefined;
		start_permlink: string | undefined;
	};
	'bridge.get_discussion': {
		author: string;
		permlink: string;
	};
  }
const rpcClient = new RpcClient<HiveService>({ url: 'https://api.hive.blog/' });


function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


async function getData(communityName: string, size: number) {
	let start_author: string | undefined;
	let start_permlink: string | undefined;

	let result: any[] = [];
	const iters = size / 20;
	let id = 1;
	for(let req=0;req<iters;req++) {
		console.log("Pobieranie postów " + req + " / " + iters);
		console.log(start_author, start_permlink);
		const response = await rpcClient.makeRequest({
			method: 'condenser_api.get_discussions_by_created',
			params: {tag: communityName, limit: 20, start_author: start_author, start_permlink: start_permlink},
			id: id++,
			jsonrpc: '2.0',
		  });
		const findPosts = response.data.result as any[]; // Fixme: types
		
		//console.log(findPosts);
		const rec = await Promise.all(findPosts.map(async (el: any) => {
			const commentsResp = await rpcClient.makeRequest({
				method: 'bridge.get_discussion',
				params: {author: el.author, permlink: el.permlink},
				id: id++,
				jsonrpc: '2.0',
			  });

			const comments = Object.values(commentsResp.data.result);
			const dates = comments.map((el:any) => new Date(el.created).getTime());
			const lastComment = dates.length > 0 ? new Date(Math.max.apply(null, dates)) : 0;
			return {title: el.title, permlink: el.permlink, author: el.author,  created: new Date(el.created), comments: comments, lastComment: lastComment};
		})) as any[];
		result = result.concat(rec);
		if(rec.length == 0) {
			break;
		}
		//console.log(result[result.length - 1]);
		start_author = result[result.length - 1].author;
		start_permlink = result[result.length - 1].permlink;


		await sleep(2000);
	}

	result.sort((a: any, b:any) => {
		if(a.lastComment < b.lastComment) return 1;
		if(a.lastComment > b.lastComment) return -1;
		return 0;
	})

	var date = new Date();
	result.forEach((element :any, index: number, array: any[]) => {
		console.log();
		const title = element.title.replace(/(.{80})..+/, "$1…");
		console.log((index + "").padStart(2, "0") + "." + title.padEnd(80, " ") + ": " + ((date.getTime() - element.created.getTime()) / (1000 * 3600 * 24)).toFixed() + " dni temu");
		console.log("    author: " + element.author);
		console.log("    permlink: " + element.permlink);
		console.log("    full: @" + element.author + "/" + element.permlink);
		
		if(element.comments == null) {
			return;
		}

		console.log("    komentarze: ");

		element.comments.sort((a: any, b:any) => {
			if(a.created < b.created) return 1;
			if(a.created > b.created) return -1;
			return 0;
		})

		element.comments.forEach((comment: any, index: number) => {
			const voted = comment.active_votes != undefined && comment.active_votes.find((vote: any) => vote.voter === "hive-199021");

			console.log("      " + (index + "").padStart(2, "0") + "." + (comment.author + (voted != undefined ? "*" : "")).padEnd(30, " ") + ": " + ((date.getTime() - new Date(comment.created).getTime()) / (1000 * 3600 * 24)).toFixed() + " dni temu");
		});
	});
}

//getData("hive-163456")//
getData("hive-199021", 500)// Sarmatia
//getData("hive-134382",500) // Polish

  