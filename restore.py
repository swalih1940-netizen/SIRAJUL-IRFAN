import json

log_path = r'C:\Users\sanus_uu6200b\.gemini\antigravity\brain\c134fd44-94ea-4554-8899-47255c4b84b8\.system_generated\logs\transcript.jsonl'

best_content = None

with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            # Check if this step has tool_calls
            if 'tool_calls' in data:
                for call in data['tool_calls']:
                    if call['function']['name'] in ['default_api:write_to_file', 'default_api:replace_file_content', 'default_api:multi_replace_file_content']:
                        args = json.loads(call['function']['arguments'])
                        if 'TargetFile' in args and 'home.hbs' in args['TargetFile']:
                            if 'CodeContent' in args:
                                best_content = args['CodeContent']
                            elif 'ReplacementContent' in args:
                                # Not perfect, but we can't easily reconstruct from replacements unless we parse carefully
                                pass
                            
                    elif call['function']['name'] == 'default_api:view_file':
                        # The response to view_file might be in the next step, but let's check
                        pass
        except Exception as e:
            pass
            
if best_content:
    with open(r'd:\SISA WEB\views\home.hbs', 'w', encoding='utf-8') as out:
        out.write(best_content)
    print("Successfully restored from write_to_file!")
else:
    print("Could not find full write_to_file for home.hbs.")
